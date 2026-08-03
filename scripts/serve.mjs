import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { createServer } from "node:http"
import { extname, join, normalize } from "node:path"

const root = process.cwd()
const port = Number(process.env.PORT ?? 4173)
const mime = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".map": "application/json; charset=utf-8",
}

createServer(async (request, response) => {
  const requested = request.url === "/" ? "/examples/standalone/index.html" : request.url ?? "/"
  const safePath = normalize(requested.split("?")[0]).replace(/^(\.\.(\/|\\|$))+/, "")
  const filePath = join(root, safePath)
  try {
    const details = await stat(filePath)
    if (!details.isFile()) throw new Error("Not a file")
    response.writeHead(200, { "content-type": mime[extname(filePath)] ?? "application/octet-stream" })
    createReadStream(filePath).pipe(response)
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" })
    response.end("Not found")
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Magic Mouse Movements demo: http://127.0.0.1:${port}`)
})
