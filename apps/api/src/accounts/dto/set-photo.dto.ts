import { IsOptional, IsUrl, MaxLength } from 'class-validator';

export class SetPhotoDto {
  /**
   * URL da foto já hospedada. `null` remove a foto (direito do responsável — a
   * foto é opcional por LGPD).
   */
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'] }, { message: 'Informe uma URL de imagem válida.' })
  @MaxLength(500)
  photoUrl?: string | null;
}
