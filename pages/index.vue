<template>
  <form @submit.prevent="goToID">
    <label>ID: <input
        type="text"
        v-model="id"
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
      this.$router.push("/show?id=" + this.id);
    }
  }
}
</script>