import Busboy from 'busboy'

export interface FileMeta {
  filename: string
  encoding: string
  mimeType: string
}

// Output as Buffer
export async function parseBodyForBuffer(req: any): Promise<{ file: Buffer, filename: FileMeta }> {
  const { file, filename } = await parseBodyForFile(req)
  const chunks: Buffer[] = []
  const stream: any = file
  return new Promise((resolve, reject) => {
    stream.on('data', function (data: any) {
      chunks.push(data)
    })
    stream.on('end', function() {
      const binaryContent = Buffer.concat(chunks)
      resolve({ file: binaryContent, filename })
    })
    stream.on('error', reject)
  })
}

// Output as FileStream
export function parseBodyForFile(req: any): Promise<{ file: ReadableStream, filename: FileMeta }> {
  const contentType = req.headers['content-type'] || req.headers['Content-Type']
  const event = req.apiGateway?.event
  if (event) {
    const encoding = event.isBase64Encoded ? 'base64' : 'binary'
    return parseBody(
      contentType,
      (bb) => {
        bb.write(req.body, encoding)
      },
    )
  }
  return parseBody(
    contentType,
    (bb) => {
      req.pipe(bb)
    },
  )
}

export function parseBody(contentType: string, onTrigger: (busboy: Busboy.Busboy) => void): Promise<{ file: ReadableStream, filename: FileMeta }> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: {
        'content-type': contentType,
      },
      limits: {
        files: 1,
      },
    })

    busboy.once('file', _onFile)
    busboy.once('error', _onError)
    // manipulate this encoding!
    onTrigger(busboy)

    function _cleanup() {
      busboy.removeListener('file', _onFile)
      busboy.removeListener('error', _onError)
    }

    function _onFile(fieldname: string, file: ReadableStream, filename: FileMeta) {
      _cleanup()
      resolve({ file, filename })
    }

    function _onError(err: Error) {
      _cleanup()
      reject(err)
    }
  })
}

