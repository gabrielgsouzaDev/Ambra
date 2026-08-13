import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';
import { parse } from 'papaparse';
import { CreateStudentDto } from '../accounts/dto/create-student.dto';
import { StudentsService } from '../accounts/students.service';
import { ImportDto } from './dto/import.dto';

/** Máximo de linhas por importação (defesa contra DoS). */
const MAX_IMPORT_ROWS = 2000;

interface RowError {
  row: number; // linha no CSV (1-based, contando o cabeçalho)
  rm?: string;
  error: string;
}

export interface ImportResult {
  total: number;
  created: number;
  failed: RowError[];
}

/** Achata os erros de validação (inclui os aninhados dos responsáveis) numa string. */
function flattenErrors(errors: ValidationError[]): string {
  return errors
    .map((e) => {
      const own = Object.values(e.constraints ?? {});
      const children = e.children?.length ? [flattenErrors(e.children)] : [];
      return [...own, ...children].filter(Boolean).join('; ');
    })
    .filter(Boolean)
    .join(' | ');
}

@Injectable()
export class ImportService {
  constructor(private readonly students: StudentsService) {}

  /**
   * Importa alunos + responsáveis de um CSV. Layout: 1 linha por aluno, colunas
   * nome, turma, rm, responsavel1_nome, responsavel1_email, responsavel2_nome?,
   * responsavel2_email?. Processa linha a linha e devolve um relatório — uma linha
   * ruim não derruba as outras. Idempotente: RM já existente cai como falha, sem duplicar.
   */
  async importCsv(dto: ImportDto): Promise<ImportResult> {
    const parsed = parse<Record<string, string>>(dto.csv.trim(), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
    });

    const rows = parsed.data;
    // Cap de linhas: evita DoS (o processamento cria alunos linha a linha).
    if (rows.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException(
        `Importação limitada a ${MAX_IMPORT_ROWS} linhas por vez. Divida o arquivo.`,
      );
    }

    const failed: RowError[] = [];
    let created = 0;

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const lineNo = i + 2; // +1 cabeçalho, +1 base-1
      if (!raw) continue;

      const candidate = this.toCreateInput(raw);
      const instance = plainToInstance(CreateStudentDto, candidate);
      const errors = validateSync(instance, { whitelist: true });
      if (errors.length > 0) {
        failed.push({ row: lineNo, rm: candidate.rm, error: flattenErrors(errors) });
        continue;
      }

      try {
        await this.students.createStudent(instance);
        created++;
      } catch (error) {
        failed.push({ row: lineNo, rm: candidate.rm, error: (error as Error).message });
      }
    }

    return { total: rows.length, created, failed };
  }

  private toCreateInput(raw: Record<string, string>): {
    name: string;
    turma?: string;
    rm: string;
    guardians: Array<{ name: string; email: string }>;
  } {
    const guardians: Array<{ name: string; email: string }> = [];
    const g1Name = (raw['responsavel1_nome'] ?? '').trim();
    const g1Email = (raw['responsavel1_email'] ?? '').trim();
    if (g1Name || g1Email) guardians.push({ name: g1Name, email: g1Email });

    const g2Name = (raw['responsavel2_nome'] ?? '').trim();
    const g2Email = (raw['responsavel2_email'] ?? '').trim();
    if (g2Name || g2Email) guardians.push({ name: g2Name, email: g2Email });

    const turma = (raw['turma'] ?? '').trim();
    return {
      name: (raw['nome'] ?? '').trim(),
      turma: turma || undefined,
      rm: (raw['rm'] ?? '').trim(),
      guardians,
    };
  }
}
