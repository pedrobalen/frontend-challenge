const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_FILE_BYTES = 5 * 1024 * 1024
const AVATAR_SIZE = 192

export class AvatarFileError extends Error {}

/**
 * Valida o arquivo escolhido e gera um JPEG quadrado de 192 px (recorte central).
 * A imagem reduzida é o que vai para a API, então o envio fica leve.
 */
export async function toAvatarDataUrl(file: File) {
  if (!ACCEPTED_TYPES.includes(file.type)) throw new AvatarFileError('Use uma imagem PNG, JPEG ou WebP.')
  if (file.size > MAX_FILE_BYTES) throw new AvatarFileError('Escolha uma imagem de até 5 MB.')

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new AvatarFileError('Não foi possível ler esta imagem. Escolha outra.')
  }
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE
  canvas
    .getContext('2d')!
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.85)
}
