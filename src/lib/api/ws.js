import path from 'path'
import fs from 'fs'

export class WebSocketApi {
  constructor(ws) {
    this.alive = true
    this.ws = ws
  }

  send(json) {
    this.ws.send(JSON.stringify(json))
  }

  ping() {
    if (!this.alive) {
      this.ws.terminate()
      return
    }

    this.send({
      type: 'app/state',
    })

    this.alive = false
    this.ws.ping(() => {})
  }

  pong() {
    this.alive = true
  }

  scriptRun(script) {
    this.send({
      type: 'script/run',
      body: {
        name: path.basename(script),
      },
    })
  }

  scriptStop() {
    this.send({
      type: 'script/stop',
    })
  }

  scriptPut(script) {
    this.send({
      type: 'script/put',
      body: {
        name: path.basename(script),
        data: fs.readFileSync(script, { encoding: 'base64' }),
      },
    })
  }

  scriptDelete(script) {
    this.send({
      type: 'script/delete',
      body: {
        name: path.basename(script),
      },
    })
  }

  logGet() {
    this.send({
      type: 'system/log/get',
      body: {
        last: 10,
      },
    })
  }

  logDelete() {
    this.send({
      type: 'system/log/delete',
    })
  }

  respring() {
    this.send({
      type: 'system/respring',
    })
  }

  reboot() {
    this.send({
      type: 'system/respring',
    })
  }
}
