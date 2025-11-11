<script setup lang="ts">

const props = defineProps<{
    scanState: searchUpdate | undefined
}>();

</script>


<template>

    <table style="display: block;" class="q-pa-sm q-mb-sm">
        <thead>
            <tr>
            <th>Arc Candidates</th>
            <th>Found Arcs</th>
            <th>New Arcs</th>
            </tr>
        </thead>
          
        <tbody>
        <tr>
            <td>{{ scanState?.arcCandidates || 0 }}</td>
            <td>{{ scanState?.arcFound || 0 }}</td>
            <td>{{ scanState?.arcNew || 0 }}</td>
        </tr>
        </tbody>
    </table>

</template>