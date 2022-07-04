import axios from 'axios'
import path from 'path'
import fs from 'fs'

export class HttpApi {
  constructor(ip, onResponse, onClientDelete) {
    this.ip = ip
    this.onResponse = onResponse
    this.onClientDelete = onClientDelete
    this.error_count = 0
    this.axios = axios.create({
      timeout: 5000,
      baseURL: `http://${ip}:46952/api/`,
    })
  }

  r(type, error = '', body = {}) {
    if (error) {
      this.error_count++
      if (this.error_count >= 3) {
        this.onClientDelete(this.ip)
      }
      error = error ? `${this.ip} ${error}` : ''
    } else {
      this.error_count = 0
    }

    this.onResponse(this.ip, {
      type,
      error,
      body,
    })
  }

  async ping() {
    const type = 'app/state'
    try {
      const res = await this.axios.get(type)
      if (res.status !== 200) {
        this.r(type, `未知状态码: ${res.status}`)
      }
      this.r(type, '', res.data)
    } catch (e) {
      this.r(type, e.message)
    }
  }

  pong() {}

  async scriptRun(script) {
    const type = 'script/run'
    const name = path.basename(script)
    try {
      const res = await this.axios.post(`/script/${name}/run`)
      if (res.status !== 204) {
        this.r(type, `未知状态码: ${res.status}`)
      }
      this.r(type)
    } catch (e) {
      this.r(type, e.message)
    }
  }

  async scriptStop() {
    const type = 'script/stop'
    try {
      const res = await this.axios.post(type)
      if (res.status !== 204) {
        this.r(type, `未知状态码: ${res.status}`)
      }
      this.r(type)
    } catch (e) {
      this.r(type, e.message)
    }
  }

  async scriptPut(script) {
    const type = 'script/put'
    const name = path.basename(script)
    try {
      const res = await this.axios.put(
        `/script/${name}`,
        fs.readFileSync(script),
      )
      if (res.status !== 204) {
        this.r(type, `未知状态码: ${res.status}`)
      }
      this.r(type)
    } catch (e) {
      this.r(type, e.message)
    }
  }

  async scriptDelete(script) {
    const type = 'script/delete'
    const name = path.basename(script)
    try {
      const res = await this.axios.delete(`/script/${name}`)
      if (res.status !== 204) {
        this.r(type, `未知状态码: ${res.status}`)
      }
      this.r(type)
    } catch (e) {
      this.r(type, e.message)
    }
  }

  async logGet() {
    const type = 'system/log/get'
    try {
      const res = await this.axios.get(`/system/log?last=10`)
      if (res.status !== 200 && res.status !== 204 && res.status !== 206) {
        this.r(type, `未知状态码: ${res.status}`)
      }
      this.r(type, '', res.data)
    } catch (e) {
      this.r(type, e.message)
    }
  }

  async logDelete() {
    const type = 'system/log/delete'
    try {
      const res = await this.axios.delete(`/system/log`)
      if (res.status !== 204) {
        this.r(type, `未知状态码: ${res.status}`)
      }
      this.r(type)
    } catch (e) {
      this.r(type, e.message)
    }
  }

  async respring() {
    const type = 'system/respring'
    try {
      const res = await this.axios.post(type)
      if (res.status !== 204) {
        this.r(type, `未知状态码: ${res.status}`)
      }
      this.r(type)
    } catch (e) {
      this.r(type, e.message)
    }
  }

  async reboot() {
    const type = 'system/reboot'
    try {
      const res = await this.axios.post(type)
      if (res.status !== 204) {
        this.r(type, `未知状态码: ${res.status}`)
      }
      this.r(type)
    } catch (e) {
      this.r(type, e.message)
    }
  }
}
