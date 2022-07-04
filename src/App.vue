<template>
  <a-locale-provider :locale="locale">
    <DeviceList />
  </a-locale-provider>
</template>

<script>
import zhCN from 'ant-design-vue/lib/locale-provider/zh_CN'
import DeviceList from './components/DeviceList'

export default {
  components: {
    DeviceList,
  },
  data() {
    return {
      locale: zhCN,
    }
  },
}
</script>
