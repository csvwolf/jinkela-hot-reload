const Koa = require('koa')
const WebSocket = require('ws')
const chokidar = require('chokidar')

const app = new Koa()
const fs = require('fs').promises
const wss = new WebSocket.Server({ port: 8000 })
const dir = './static'

const watcher = chokidar.watch('./static', {
  ignored: /node_modules|\.git|[\/\\]\./
})

wss.on('connection', (ws) => {
  watcher
    .on('add', path => console.log(`File ${path} added`))
    .on('change', path => console.log(`File ${path} has been changed`))
    .on('unlink', path => console.log(`File ${path} has been moved`))
    .on('all', async (event, path) => {
      if (path.endsWith('.html')) {
        body = await fs.readFile(path, {
          encoding: 'utf-8'
        })
        const message = JSON.stringify({ type: 'html', content: body })
        ws.send(message)
      } else if (path.endsWith('.js')) {
        body = await fs.readFile(path, {
          encoding: 'utf-8'
        })
        const message = JSON.stringify({ type: 'js', content: body })
        ws.send(message)
      } else if (path.endsWith('.css')) {
        const message = JSON.stringify({ type: 'css', content: path.split('static/')[1] })
        ws.send(message)
      }
      // Simple Live Reload
      // ws.send('reload')
    })

  ws.on('message', (message) => {
    console.log('received: %s', message)
  })
  ws.send('HMR Client is Ready')
})

const injectedData = `<script>{
  const socket = new WebSocket('ws://localhost:8000');
  const JKL = window.Jinkela
  const storage = {}
  let latest = true

  window.Jinkela = class jkl extends JKL {
    constructor(...args) {
      super(...args)
      const values = storage[this.__proto__.constructor.name]
      console.log('is latest', latest)
      if (!latest) {
        storage[this.__proto__.constructor.name].forEach(el => el.remove())
        latest = true
      }
      storage[this.__proto__.constructor.name] = values ? [...values, this.element] : [ this.element ]
    }
  }

  socket.addEventListener('open', (event) => {
    socket.send('[HMR] is Ready');
    console.log('[HMR] Start')
  });
  socket.addEventListener('message', function (event) {
    // Simple Live Reload
    let data = {}
    try {
      data = JSON.parse(event.data)
    } catch (e) {
      // return
    }
    console.log(data)
    if (data.type === 'html') {
      document.write(data.content);
      document.close();
      console.log('[HMR] updated HTML');
    } else if (data.type === 'js') {
      latest = false
      eval(data.content)
      console.log('[HMR] updated JS');
    } else if (data.type === 'css') {
      const host = location.host
      document.querySelectorAll('link[rel="stylesheet"]').forEach(el => {
        const resource = el.href.split(host + '/')[1]
        console.log(resource)
        if (resource === data.content) el.remove()
      })
      document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="' + data.content + '" />')
      console.log('[HMR] updated CSS');
    }
    // if (event.data === 'reload') window.location.reload()
  })};
</script>`

app.use(async (ctx, next) => {
  let file = ctx.path
  if (ctx.path.endsWith('/')) {
    file = ctx.path + 'index.html'
  }
  let body
  try {
    body = await fs.readFile(dir + file, {
      encoding: 'utf-8'
    })
  } catch(e) {
    ctx.status = 404
    return next()
  }

  if (file.endsWith('.html')) body = body.replace('<body>', `<body>${injectedData}`)
  if (file.endsWith('.css')) ctx.type = 'text/css'
  ctx.body = body
  next()
})

app.listen(3001)

console.log('listen on port 3001')

