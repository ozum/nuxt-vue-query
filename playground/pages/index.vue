<template>
  <div>
    <div>Hello,</div>
    <span v-if="isLoading">Loading</span>
    <span v-if="isFetching">Fetching</span>
    <span v-if="isError">Error</span>
    <div v-if="data">
      {{ data }}
    </div>
  </div>
</template>


<script setup lang="ts">
import { useApiGet } from '#imports';

const { data, isLoading, isFetching, isError } = useApiGet('/api/item');
</script>
