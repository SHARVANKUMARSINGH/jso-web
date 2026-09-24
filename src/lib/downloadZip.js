import JSZip from 'jszip'

/** Bundles the built app's files into a .zip and triggers a browser
 *  download — entirely client-side, no server round-trip. */
export async function downloadProjectAsZip(files, projectName) {
  const zip = new JSZip()
  for (const file of files) {
    zip.file(file.path, file.contents)
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)

  const safeName = projectName.trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'app'

  const link = document.createElement('a')
  link.href = url
  link.download = `${safeName}.zip`
  document.body.appendChild(link)
  link.click()
  link.remove()

  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
