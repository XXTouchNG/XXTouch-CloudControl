<template>
  <a-layout id="components-layout-demo-fixed-sider">
    <a-layout-sider
      :style="{
        overflow: 'auto',
        height: '100vh',
        minWidth: '300px',
        position: 'fixed',
        left: 0,
      }"
    >
      <div class="logo">
        <img src="../assets/logo.png" alt="" height="32" />
        触摸精灵
      </div>
      <a-menu
        theme="dark"
        mode="inline"
        :selectable="false"
        :open-keys.sync="openKeys"
      >
        <a-sub-menu key="local">
          <span slot="title"><a-icon type="apartment" />局域网</span>
          <a-menu-item key="local_scan" @click="onLocalScan">
            <a-icon type="search" />
            <span class="nav-text">扫描</span>
          </a-menu-item>
          <a-menu-item key="local_add" @click="showLocalAdd = true">
            <a-icon type="plus-circle" />
            <span class="nav-text">输入</span>
          </a-menu-item>
        </a-sub-menu>
        <a-sub-menu key="cloud">
          <span slot="title"><a-icon type="cloud" />广域网</span>
          <a-menu-item key="cloud_ip">
            <a-icon type="info-circle" />
            <span class="nav-text">{{ serverAddress }}</span>
          </a-menu-item>
        </a-sub-menu>
      </a-menu>
    </a-layout-sider>

    <a-modal title="输入设备IP" v-model="showLocalAdd" @ok="onLocalAdd">
      <a-input v-model="localAddress"></a-input>
    </a-modal>

    <a-layout :style="{ marginLeft: '300px', height: '100vh' }">
      <a-layout-content :style="{ margin: '5px 16px 0', overflow: 'initial' }">
        <a-row>
          <a-col :span="4">
            <a-dropdown :disabled="selectedClients.length === 0">
              <a-menu slot="overlay">
                <a-menu-item
                  v-for="action in actions('*')"
                  :key="action.action"
                  @click="onAction(selectedClients, action.action)"
                >
                  {{ action.title }}
                </a-menu-item>
              </a-menu>
              <a-button :style="{ width: '100%' }">
                批量操作 <a-icon type="down" />
              </a-button>
            </a-dropdown>
          </a-col>
          <a-col :span="20">
            <a-input-search
              :readOnly="true"
              v-model="script"
              addon-before="脚本"
              enter-button
              @search="onSelectScript"
            />
          </a-col>
        </a-row>
        <a-table
          bordered
          size="small"
          :pagination="{ defaultPageSize: 10, showSizeChanger: true }"
          :row-selection="{
            selectedClients: selectedClients,
            onChange: onSelectChange,
          }"
          :columns="columns"
          :data-source="dataSource"
        >
          <span slot="os" slot-scope="os">
            <a-icon type="android" v-if="os === 'android'" />
            <a-icon type="apple" v-else />
          </span>
          <span slot="action" slot-scope="record">
            <a-dropdown>
              <a class="ant-dropdown-link" @click="(e) => e.preventDefault()">
                操作 <a-icon type="down" />
              </a>
              <a-menu slot="overlay">
                <a-menu-item
                  v-for="action in actions(record.key)"
                  :key="action.action"
                  :disabled="action.disabled"
                  @click="onAction([record.key], action.action)"
                >
                  {{ action.title }}
                </a-menu-item>
              </a-menu>
            </a-dropdown>
          </span>
        </a-table>
      </a-layout-content>

      <a-divider orientation="left">
        {{ logClient }}
      </a-divider>
      <a-textarea placeholder="设备日志" :rows="10" v-model="log" />

      <a-layout-footer :style="{ textAlign: 'center' }"></a-layout-footer>
    </a-layout>
  </a-layout>
</template>

<script>
import WebSocket from 'ws'
import { v4 as uuidv4 } from 'uuid'
import { Map } from 'immutable'
import { remote } from 'electron'
import { WebSocketApi } from '@/lib/api/ws.js'
import { HttpApi } from '@/lib/api/http.js'
import dgram from 'dgram'
import ip from 'ip'

export default {
  mounted() {
    this.initServer()
    this.initTimer()
    this.serverAddress = `ws://${ip.address()}:9000`
  },

  data() {
    return {
      serverAddress: '',
      clients: Map(),
      script: '',
      selectedClients: [],
      openKeys: ['local', 'cloud'],
      showLocalAdd: false,
      localAddress: '',
      log: '',
      logTimer: null,
      logClient: '',
      columns: [
        {
          title: '设备',
          dataIndex: 'name',
          key: 'name',
          sorter: (a, b) => a.name > b.name,
        },
        {
          title: '串号',
          dataIndex: 'sn',
          key: 'sn',
          sorter: (a, b) => a.sn > b.sn,
        },
        {
          title: '网络',
          dataIndex: 'from',
          key: 'from',
          sorter: (a, b) => a.from > b.from,
        },
        {
          title: '系统',
          dataIndex: 'os',
          key: 'os',
          scopedSlots: { customRender: 'os' },
        },
        {
          title: '注册',
          dataIndex: 'license',
          key: 'license',
          sorter: (a, b) => a.license > b.license,
        },
        {
          title: '脚本',
          dataIndex: 'script_select',
          key: 'script_select',
        },
        {
          title: '运行',
          dataIndex: 'script_running',
          key: 'script_running',
        },
        {
          title: '操作',
          key: 'action',
          scopedSlots: { customRender: 'action' },
        },
      ],
    }
  },

  computed: {
    dataSource() {
      return Array.from(this.clients.values())
        .filter((client) => client.state)
        .map((client) => {
          return {
            key: client.key,
            name: client.state.system.name,
            sn: client.state.system.sn,
            from: client.from,
            os: client.state.system.os,
            license: client.state.app.license,
            script_select: client.state.script.select,
            script_running: client.state.script.running ? '是' : '否',
          }
        })
    },
  },

  methods: {
    onResponse(key, json) {
      if (json.error) {
        this.$message.error(`错误: ${json.error}`)
        return
      }

      switch (json.type) {
        case 'app/state':
          this.clients = this.clients.update(key, (client) => ({
            ...client,
            state: json.body,
          }))
          break
        case 'script/run':
          this.$message.info(`运行脚本成功`)
          break
        case 'script/stop':
          this.$message.info(`停止脚本成功`)
          break
        case 'script/put':
          this.$message.info(`上传脚本成功`)
          break
        case 'script/delete':
          this.$message.info(`删除脚本成功`)
          break
        case 'system/log/get':
          this.log = json.body
          break
        case 'system/log/delete':
          this.$message.info(`日志删除成功`)
          break
        case 'system/respring':
          this.$message.info(`注销成功`)
          break
        case 'system/reboot':
          this.$message.info(`重启成功`)
          break
        default:
          this.$message.info(`${json.type}成功`)
          break
      }
    },

    initServer() {
      const wss = new WebSocket.Server({ port: 9000 })
      wss.on('connection', (ws) => {
        ws.uuid = uuidv4()
        ws.api = new WebSocketApi(ws)
        this.clients = this.clients.set(ws.uuid, {
          key: ws.uuid,
          from: '广域网',
          state: null,
          api: ws.api,
        })

        ws.on('pong', () => {
          ws.api.pong()
        })

        ws.on('close', () => {
          this.clients = this.clients.delete(ws.uuid)
        })

        ws.on('message', (message) => {
          const json = JSON.parse(message)
          this.onResponse(ws.uuid, json)
        })
      })
    },

    initTimer() {
      setInterval(() => {
        this.clients.forEach((client) => {
          client.api.ping()
        })
      }, 3000)
    },

    localAdd(ip) {
      this.clients = this.clients.set(ip, {
        key: ip,
        from: '局域网',
        state: null,
        api: new HttpApi(ip, this.onResponse, this.onClientDelete),
      })
    },

    onLocalScan() {
      const client = dgram.createSocket({ type: 'udp4', reuseAddr: true })
      client.on('listening', () => {
        client.setBroadcast(true)
        client.on('message', (data, info) => {
          if (
            data.toString() === 'touchelf' &&
            !this.clients.has(info.address)
          ) {
            this.$message.info(`发现设备 ${info.address}, 连接中...`)
            this.localAdd(info.address)
          }
        })
        client.send('touchelf', 14099, '255.255.255.255')
      })
      client.bind()
    },

    onLocalAdd() {
      this.showLocalAdd = false
      if (
        !/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
          this.localAddress,
        )
      ) {
        this.$message.error('IP格式错误')
        return
      }
      if (this.clients.has(this.localAddress)) {
        this.$message.error('设备已存在')
        return
      }
      this.localAdd(this.localAddress)
    },

    onClientDelete(key) {
      this.clients = this.clients.delete(key)
    },

    onSelectScript() {
      const path = remote.dialog.showOpenDialogSync({
        filters: [{ name: '脚本', extensions: ['lua', 'e3', 'tep', 'tepe'] }],
        properties: ['openFile'],
      })
      if (!path) {
        return
      }
      this.script = path[0]
    },

    onSelectChange(selectedClients) {
      this.selectedClients = selectedClients
    },

    actions(key) {
      const actions = [
        { title: '脚本运行', action: 'script_run' },
        { title: '脚本停止', action: 'script_stop' },
        { title: '脚本上传', action: 'script_put' },
        { title: '脚本删除', action: 'script_delete' },
      ]
      if (key !== '*') {
        actions.push({ title: '日志获取', action: 'log_get' })
      }
      actions.push({ title: '日志删除', action: 'log_delete' })
      if (key === '*' || this.clients.get(key).state.system.os === 'ios') {
        actions.push({ title: '注销', action: 'respring' })
      }
      actions.push({ title: '重启', action: 'reboot' })
      if (key !== '*' && this.clients.get(key).from === '局域网') {
        actions.push({ title: '删除', action: 'delete' })
      }
      return actions
    },

    onAction(keys, action) {
      if (action.startsWith('script') && !this.script) {
        this.$message.error('请先选择脚本')
        return
      }

      for (const key of keys) {
        const client = this.clients.get(key)
        const api = client.api
        switch (action) {
          case 'script_run':
            api.scriptRun(this.script)
            break
          case 'script_stop':
            api.scriptStop()
            break
          case 'script_put':
            api.scriptPut(this.script)
            break
          case 'script_delete':
            api.scriptDelete(this.script)
            break
          case 'log_get':
            clearInterval(this.logTimer)
            this.logTimer = setInterval(() => {
              api.logGet()
            }, 2000)
            this.logClient = client.state.system.name
            break
          case 'log_delete':
            api.logDelete()
            break
          case 'respring':
            api.respring()
            break
          case 'reboot':
            api.reboot()
            break
          case 'delete':
            this.onClientDelete(client.key)
            break
          default:
            this.$message.error(`未知操作${action}`)
            break
        }
      }
    },
  },
}
</script>

<style>
#components-layout-demo-fixed-sider .logo {
  height: 32px;
  margin: 16px;
  color: gray;
  font-size: 12px;
}
</style>
