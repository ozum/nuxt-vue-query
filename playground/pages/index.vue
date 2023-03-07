<template>
    <div>
      <span v-if="isLoading">Loading</span>
      <span v-if="isFetching">Fetching</span>
      <span v-if="isError">Error</span>
      <div v-if="data">
        Time is: {{ data }}
    </div>
  </div>
</template>


<script setup lang="ts">
import { useApiGet } from '#imports';

const { data, isLoading, isFetching, isError } = await useApiGet('/api/time');
</script>
