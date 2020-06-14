import {fs,path,ws,http,https,url,chokidar,EventEmitter} from './node.js'

const version = '7';
const extensions = ['html', 'css', 'mjs','js', 'png', 'gif', 'jpg', 'php', 'php5', 'py', 'rb', 'erb', 'coffee'];
const ignored = [/\.git\//, /\.svn\//, /\.hg\//];
const port = 35729

const debug = str => process.env.debug ? console.log(str + "\n") : '';

const onMessage = message => {
  debug("Client message: " + message);
  const request = JSON.parse(message);
  const data = JSON.stringify({
    command: 'hello',
    protocols: ['http://livereload.com/protocols/official-7', 'http://livereload.com/protocols/official-8', 'http://livereload.com/protocols/official-9', 'http://livereload.com/protocols/2.x-origin-version-negotiation', 'http://livereload.com/protocols/2.x-remote-control'],
    serverName: 'node-livereload'
  });
  if (request.command === "hello") {
    debug("Client requested handshake...");
    debug("Handshaking with client using protocol " + version + "...");
    socket.send(data);
  }
  if (request.command === "info") {
    return debug("Server received client data. Not sending response.");
  }
}

const onConnect = socket => socket.on('message', onMessage)
const onUpgrade = (req,socket,head) => new ws.Server({ noServer: true }).on('connection', onConnect).handleUpgrade(req, socket, head, onConnect);

//https://unpkg.com/livereload-js@3.2.3/dist/livereload.min.js

const cacheLiveReloadJS = []
const LiveReloadJSFromNPM = fs.readFileSync(require.resolve('livereload-js'))
const LiveReloadJSFromUnpkg = fs.readFileSync(require.resolve('livereload-js'))
const serveLivereloadJs = (req, res) => {
  if (url.parse(req.url).pathname === '/livereload.js') {
    res.writeHead(200, {
      'Content-Type': 'text/javascript'
    });
    return res.end();
  }
}

const server = https.createServer({
  cert: fs.readFileSync('/path/to/cert.pem'),
  key: fs.readFileSync('/path/to/key.pem')
}, serveLivereloadJs)

server.on('upgrade',onUpgrade)
//new ws.Server({ server }).on('connection', onConnect)
 
const onWatchEvent = (delay = 0) => filepath => {
  const fileext = path.extname(filepath).substring(1);
  if (extensions.indexOf(fileext) !== -1) {
    const delayedRefresh = setTimeout(function() {
      clearTimeout(delayedRefresh);
      debug("Reloading: " + filepath);
      const data = JSON.stringify({
        command: 'reload',
        path: filepath,    
        liveCSS: true,
        liveImg: false,
        originalPath: '',
        overrideURL: ''
      });
      server.clients.forEach(socket=> {
        debug("broadcasting to all clients: " + data);
        socket.send(data, error => (error ? debug(error) : ''));
      });
    }, delay);
  }
}


chokidar.watch(paths, {
  ignoreInitial: true,
  //Exclusions
  ignored,
  usePolling: false
})
.on('add', onWatchEvent())
.on('change', onWatchEvent())
.on('unlink', onWatchEvent());

server.listen(port);