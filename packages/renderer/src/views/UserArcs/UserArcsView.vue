<script lang="ts" setup>
import ViewItem from '../../components/ViewItem.vue';
import AppProperties from '../../AppProperties.ts';
import ArcControlService from '/@/ArcControlService.ts';

import {onMounted, onUnmounted, reactive, ref, nextTick, watch, computed} from 'vue';
import ScanLocalDialogStart from './ScanLocalDialogs/ScanLocalDialogStart.vue';


//const iProps = reactive({
//  show_old_msgs: false
//});
const openScanDialog = ref(false);
const list = ref<string[]>([]);
const error = ref<string>("");
const search_text = "";

const props = defineProps<{
    openArc: any
}>();


const filter_ = (list, pattern)=>{
  console.log(list)
  return list
//   return list.filter(x=>
//     x.name.toLowerCase().includes(pattern.toLowerCase())
//     || x.name_with_namespace.toLowerCase().includes(pattern.toLowerCase())
//   )
};

const init = async() => {
    list.value = await window.ipc.invoke('LocalArcService.getUserArcs');
    console.log('UserArcsView init', list);
}

const addArc = async (arc) => {
  console.log('Adding arc', arc);
  try {
    await window.ipc.invoke('LocalArcService.selectAndAddArc', arc);
    list.value = await window.ipc.invoke('LocalArcService.getUserArcs');
  } catch (e) {
    error.value = e.message;
  }
};

const addDirectory = async () => {
  console.log('Adding directory');
  try {
    await window.ipc.invoke('LocalArcService.selectAndAddDirectory');
    list.value = await window.ipc.invoke('LocalArcService.getUserArcs');
  } catch (e) {
    error.value = e.message;
  }
};

const isOpen = computed((path) => {
  console.log(ArcControlService.props.arc_root, path);
  return ArcControlService.props.arc_root === path;
})

onMounted(init);
watch(()=>AppProperties.user, init);
watch(()=>props.host, init);
watch(()=>ArcControlService.props.arc_root, init);

</script>

<template>

    
    <ViewItem
      icon="computer"
      label="User Arcs"
      caption="Arcs on this Computer"
      class="bg-blue-grey-5 overflow-scroll"
      style="position: relative; height: 100%;"
    >
    <q-list style="padding:1em" class="bg-blue-grey-1 " >

      <q-item 
        v-if="list && list.length<1"
        class="bg-red-1 q-pa-md h-20"
      >
          <q-item-section avatar>
            <q-avatar icon='sym_r_orders' text-color='white' color='secondary' />
          </q-item-section>

          <q-item-section>
            <q-item-label>No local ARCs Found</q-item-label>
          </q-item-section>

      </q-item>
    <q-list class="full-height" style="height:100%; overflow: hidden;">
      
      <q-item
          
          :class="ArcControlService.props.arc_root === item.location?'q-hoverable bg-secondary' : 'q-hoverable'"
          v-for="(item,i) in filter_(list, search_text)"
          :style="i%2===1?'background-color:#fafafa;' : ''"
        >
        <span class="q-focus-helper"></span>
        <q-item-section

          class="cursor-pointer"
          @click="()=>$props.openArc(item.location, false)"
          >
          <div class="text-bold">
            {{ item.name }}
          </div>

          <div class="q-text-subtitle2" style="color:#666; font-weight:normal;">
            {{ item.location}}
          </div>    
        </q-item-section>
        
      
          <!-- <q-item-section avatar>
            <q-avatar v-if="item.avatar_url!=null">
              <img :src="item.avatar_url">
            </q-avatar>
            <q-avatar :color="item.isOwner ? 'primary' : 'secondary'" text-color="white" v-else>{{item.namespace.name[0]}}</q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label style="font-weight:bold;">
              {{item.name}}
            </q-item-label>
            <q-item-label style="color:#666">
              <q-icon style="margin-right:0.2em;" name='update'/>{{timeDifference(item.last_activity_at)}} ago
              <a_tooltip anchor='top left' self='top left' :offset='[0,-20]' :force='true'>
                <table class='arc_info'>
                  <tbody>
                    <tr>
                      <th>Created:</th>
                      <td>{{format_date(item.created_at)}}</td>
                    </tr>
                    <tr>
                      <th>Updated:</th>
                      <td>{{format_date(item.last_activity_at)}}</td>
                    </tr>
                  </tbody>
                </table>
              </a_tooltip>

            </q-item-label>
            <q-item-label :style="'color:#666;' + (item.isOwner ? 'font-weight:bold;' :'')">{{item.name_with_namespace.split('/').slice(0,-1).join('/')}}</q-item-label>

          </q-item-section>
          <q-item-section avatar>
            <a_btn color="secondary" v-on:click="inspectArc(item.http_url_to_repo)" icon='sym_r_captive_portal'>
              <a_tooltip>
                Open the DataHUB repository in the browser
              </a_tooltip>
            </a_btn>
          </q-item-section>
          <q-item-section avatar>
            <a_btn color="secondary" v-on:click="importArc(item.http_url_to_repo)" icon='file_download'>
              <a_tooltip>
                Download (clone) selected ARC from the DataHUB
              </a_tooltip>
            </a_btn>
          </q-item-section> -->
      </q-item>
      </q-list>
    </q-list>
    <q-list style="position: sticky; bottom:0; width: 100%;">
      <q-item class="bg-red-1 q-pa-md flex row justify-end ">
          <q-btn
              color="primary"
              icon="add"
              label="Add ARC"
              @click="addArc"
              class="q-mr-md"
            />
          <q-btn
              color="primary"
              icon="folder_open"
              label="Add Directory"
              class="q-mr-md"
              @click="addDirectory"
            />  
          <q-btn
              color="secondary"
              icon="refresh"
              label="Scan"
              @click="openScanDialog = true"
              class="q-mr-md"
            />
      </q-item>
    </q-list>    
    </ViewItem>

   
    <ScanLocalDialogStart v-model="openScanDialog"/>
</template>

