<template>
  <form @submit.prevent="goToID">
    <label>Th ID: <input
        type="text"
        v-model="id"
        spellcheck="false"
        autocorrect="off"
        autocapitalize="off"
        placeholder="something-spectacular"
      >
    </label>
    <button>Show</button>
  </form>
</template>

<script>
export default {
  data() {
    return {
      id: ""
    }
  },
  methods: {
    goToID() {
      this.$router.push("/show?id=" + this.id.toLowerCase());
    }
  }
}
</script>