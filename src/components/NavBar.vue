<!-- src/components/NavBar.vue -->
<template>
  <nav class="fixed bottom-0 inset-x-0 bg-card border-t border-hair flex justify-around py-2">
    <router-link to="/" class="text-sm text-muted py-1 px-2" active-class="text-deep font-semibold">Merkzettel</router-link>
    <router-link to="/angebote" class="text-sm text-muted py-1 px-2" active-class="text-deep font-semibold">Angebote</router-link>
    <router-link to="/suche" class="text-sm text-muted py-1 px-2" active-class="text-deep font-semibold">Suche</router-link>
    <router-link to="/settings" class="text-sm text-muted py-1 px-2" active-class="text-deep font-semibold">Mehr</router-link>
  </nav>
</template>
