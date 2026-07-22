<!-- src/components/NavBar.vue -->
<template>
  <nav class="fixed bottom-0 inset-x-0 bg-white border-t flex justify-around py-2">
    <router-link to="/" class="text-sm" active-class="text-emerald-600 font-semibold">Merkzettel</router-link>
    <router-link to="/angebote" class="text-sm" active-class="text-emerald-600 font-semibold">Angebote</router-link>
    <router-link to="/settings" class="text-sm" active-class="text-emerald-600 font-semibold">Mehr</router-link>
  </nav>
</template>
