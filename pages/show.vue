<template>
  <div>
    <div class="noprint">
      <small>Aktuálně připojeno {{connected}} uživatelů.</small>
      <br>
      <template v-if="error">
        {{error}}
        <button @click="initialDownload">Připojit znovu</button>
        <br>
      </template>
      <template v-if="loading">
        🔃 Načítání...
        <br>
      </template>
      <input
        type="text"
        placeholder="Jméno uživatele"
        v-model="meName"
        @input="changeName"
      >&nbsp;
      <button @click="showSettings = !showSettings">🔧 Nastavení</button>&ensp;
      <template v-if="showSettings">
        <label><input
            type="checkbox"
            v-model="showComments"
          >Komentáře</label>
        <label><input
            type="checkbox"
            v-model="showNotes"
          >Poznámky</label>
      </template>
    </div>
    <div class="inline-block">
      <div
        class="schedule"
        v-for="day in days"
        :key="`a${day}`"
      >
        <h3>
          {{dayNames[(day + firstDOW - 1) % dayNames.length].capitalize()}}
        </h3>
        <div
          v-for="row in nOfRows"
          :key="`r${row - 1}`"
          :class="{mark:highlights[row-1]??false}"
        >
          <template v-if="
            /*test for not empty name*/(activities[day - 1]?.rows[row - 1]?.name?.replace(/<(.|\n)*?>/g, '')?.trim() ?? false) &&
            /*test for not overlaped */(activities[day -1]?.rows.slice(0,row-1)?.every((rw,rwIndex)=>((rw.time ?? 1) + rwIndex) < row) ?? true)
            ">
            <h4
              @dblclick="highlights[row-1] = !highlights[row-1];debouncedWrite()"
              class="time"
            >
              <input
                type="text"
                :value="this.times[row-1] || `${parseInt(from.HH) + Math.floor((row - 1) / 2) }:${ (row - 1) % 2 ? '30' : '00' }`"
                @input="changeTimes(row-1, $event)"
              >
            </h4>

            <div
              class="activity"
              tabindex="0"
              :class="bgClasses[activities[day - 1]?.rows[row-1]?.type ?? 0]"
              :rowspan="activities[day - 1]?.rows[row-1]?.time"
              v-contextmenu:contextmenu
              @contextmenu.prevent.stop="linkDisplay($event);$event.target.focus();contextDay = day-1; contextTime = row-1"
            >
              <div style="position:sticky;top:0px">
                <button
                  v-if="activities[day - 1]?.rows[row - 1]?.name
                  &&!(activities[day - 1]?.rows[row - 1]?.comment)"
                  class="startEdit"
                  @click="startEdit(day, row, true)"
                  title="Přidat komentáře"
                >+ 💬</button>
              </div>
              <div :style="{'--rs':activities[day - 1]?.rows[row-1]?.time ?? 1}">
                <template v-if="
                 (activities[day - 1]?.rows[row-1]?.touch < (nowTimestamp - 3000)
                  ||
                  activities[day - 1]?.rows[row-1]?.key == this.meKey
                 )
                 ">
                  <client-only v-if="!commentNotName && editDay == day && editRow == row">
                    <TipTap
                      title="Upravit název aktivity"
                      v-model="activities[day - 1].rows[row-1].name"
                      @update:modelValue="touchCell(day - 1, row - 1)"
                      @close="stopEdit()"
                    />
                  </client-only>
                  <div
                    v-else
                    :contenteditable="true"
                    @focus="quickEditing = true"
                    @blur="onActivityInput($event, day -1, row -1)"
                    @input="touchCell(day - 1, row - 1)"
                    v-html="activities[day - 1]?.rows[row-1]?.name ?? ''"
                    @dblclick="startEdit(day, row, false)"
                  >
                  </div>
                </template>
                <div
                  style="position:relative"
                  v-else
                >
                  <div
                    class="lock"
                    v-html="activities[day - 1]?.rows[row-1]?.name ?? ''"
                  />
                  <div>🔐<br>{{activities[day - 1]?.rows[row-1]?.key?.split('|',1)[0]}}</div>
                </div>
              </div>
              <client-only v-if="activities[day - 1]?.rows[row-1] != null &&
                 editDay == day &&
                 editRow == row &&
                 commentNotName &&
                 (activities[day - 1]?.rows[row-1].touch < (nowTimestamp - 3000)
                 ||
                  activities[day - 1]?.rows[row-1].key == this.meKey
                  )
                 ">
                <TipTap
                  v-model="activities[day - 1].rows[row-1].comment"
                  title="Upravit komentář"
                  @update:modelValue="touchCell(day - 1, row - 1)"
                  @close="stopEdit()"
                />
              </client-only>
              <div
                class="comment"
                v-else-if="activities[day - 1]?.rows[row-1]?.comment && showComments"
                v-html="activities[day - 1]?.rows[row-1]?.comment"
                @dblclick="startEdit(day, row, true)"
              >
              </div>
              <small
                class="editInfo"
                v-if="activities[day - 1]?.rows[row-1]?.touch"
              >Upravil {{(activities[day - 1]?.rows[row-1]?.key?.split('|',1) ?? [''])[0]}} {{ new Date(activities[day - 1]?.rows[row-1]?.touch).toLocaleString() }}</small>
            </div>
          </template>
        </div>
      </div>
      <span class="noprint">© 2022 OSDVF. Vytvořeno pro <a
          href="https://travna.cz"
          target="_blank"
        >Setkávání Travná z.s.</a>&nbsp;
        <a
          href="https://github.com/osdvf/tiny-harmonogram"
          target="_blank"
        >GitHub Repozitář</a>
      </span>
    </div>
    &ensp;&ensp;
    <template v-if="showNotes">
      <div
        class="inline-block notes"
        @click="editingNotes = true"
        v-html="note"
      >
      </div>
      <TipTap
        v-if="editingNotes"
        v-model="note"
        title="Poznámky"
        @close="editingNotes = false"
        @update:modelValue="updateNotes"
      />
    </template>

    <div
      v-show="quickEditing"
      class="editor__close"
    >
      ✔️
    </div>

    <v-contextmenu ref="contextmenu">
      <v-contextmenu-item
        v-if="nextLink"
        @click="goToLink"
      >
        Jít na odkaz
      </v-contextmenu-item>
      <template
        v-for="item in menuItems"
        :key="item.label"
      >
        <v-contextmenu-submenu
          v-if="item.children != null"
          :title="item.label"
        >
          <v-contextmenu-item
            v-for="subItem in item.children"
            :class="subItem.class"
            :key="subItem.label"
            @click="subItem.onClick"
          >{{subItem.label}}</v-contextmenu-item>
        </v-contextmenu-submenu>
        <v-contextmenu-item
          @click="item.onClick"
          :class="item.class"
          v-else
        >{{item.label}}</v-contextmenu-item>
      </template>
    </v-contextmenu>
  </div>
</template>
<script>
import '~/style.scss'
import { db } from "~/firebase.js"
import { get, ref, set, onValue, push, onDisconnect } from "firebase/database";
import '~/jsExtensions';
import { debounce } from 'throttle-debounce';
import sanitizeHtml from 'sanitize-html';
const allowedAttributes = {
  a: ['href', 'name', 'target'],
  // We don't currently allow img itself by default, but
  // these attributes would make sense if we did.
  img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading'],
  input: ['type'],
  ul: ["data-type"]
};
const options = {
  allowedTags: [
    "address", "article", "aside", "footer", "header", "h1", "h2", "h3", "h4",
    "h5", "h6", "hgroup", "main", "nav", "section", "blockquote", "dd", "div",
    "dl", "dt", "figcaption", "figure", "hr", "li", "main", "ol", "p", "pre",
    "ul", "a", "abbr", "b", "bdi", "bdo", "br", "cite", "code", "data", "dfn",
    "em", "i", "kbd", "mark", "q", "rb", "rp", "rt", "rtc", "ruby", "s", "samp",
    "small", "span", "strong", "sub", "sup", "time", "u", "var", "wbr", "caption",
    "col", "colgroup", "table", "tbody", "td", "tfoot", "th", "thead", "tr",
    "input"
  ],
  allowedAttributes
}
const randomKey = (Math.random() + 1).toString(36).substring(7);
export default {
  data() {
    return {
      nextLink: null,
      loading: false,
      highlights: [],
      showSettings: false,
      quickEditing: false,
      connected: 1,
      contextDay: 0,
      contextTime: 0,
      maxWidth: '300px',
      maxHeight: '300px',
      showNotes: false,
      editingNotes: false,
      note: 'Poznámky...',
      databaseKey: 'test',
      meName: '',
      nowTimestamp: Date.now(),
      error: '',
      editDay: 0,
      editRow: 0,
      commentNotName: false,
      showComments: true,
      text: {
        time: 'Čas'
      },
      firstDOW: 0,
      days: 7,
      from: {
        HH: '07',
        mm: '00',
      },
      to: {
        HH: '23',
        mm: '00',
      },
      times: [],
      activities: [
        {
          rows: [
            /* {
              name: 'Budíček',
              type: 0,
              comment: 'ahoj<br>čau',
              touch: 0 //Last touched timestamp
            } */
          ]
        }
      ],
      menuItems: [
        {
          label: 'Upravit aktivitu',
          onClick: () => this.startEdit(this.contextDay + 1, this.contextTime + 1, false)
        },
        {
          label: 'Upravit komentář',
          onClick: () => this.startEdit(this.contextDay + 1, this.contextTime + 1, true)
        },
        {
          label: "Barva",
          children: [
            { label: 'white', onClick: () => this.setActivityType(0) },
            { label: 'amber', class: 'bg-amber', onClick: () => this.setActivityType(1) },
            { label: 'blue', class: 'bg-blue', onClick: () => this.setActivityType(2) },
            { label: 'blue-grey', class: 'bg-blue-grey', onClick: () => this.setActivityType(3) },
            { label: 'brown', class: 'bg-brown', onClick: () => this.setActivityType(4) },
            { label: 'cyan', class: 'bg-cyan', onClick: () => this.setActivityType(5) },
            { label: 'deep-orange', class: 'bg-deep-orange', onClick: () => this.setActivityType(6) },
            { label: 'deep-purple', class: 'bg-deep-purple', onClick: () => this.setActivityType(7) },
            { label: 'green', class: 'bg-green', onClick: () => this.setActivityType(8) },
            { label: 'grey', class: 'bg-grey', onClick: () => this.setActivityType(9) },
            { label: 'indigo', class: 'bg-indigo', onClick: () => this.setActivityType(10) },
            { label: 'light-blue', class: 'bg-light-blue', onClick: () => this.setActivityType(11) },
            { label: 'light-green', class: 'bg-light-green', onClick: () => this.setActivityType(12) },
            { label: 'lime', class: 'bg-lime', onClick: () => this.setActivityType(13) },
            { label: 'orange', class: 'bg-orange', onClick: () => this.setActivityType(14) },
            { label: 'pink', class: 'bg-pink', onClick: () => this.setActivityType(15) },
            { label: 'purple', class: 'bg-purple', onClick: () => this.setActivityType(16) },
            { label: 'red', class: 'bg-red', onClick: () => this.setActivityType(17) },
            { label: 'teal', class: 'bg-teal', onClick: () => this.setActivityType(18) },
            { label: 'yellow', class: 'bg-yellow', onClick: () => this.setActivityType(19) },
          ]
        },
      ]
    }
  },
  watch:
  {
    days() {
      this.addMissingDays();
      this.addMissingRows();
    },
    from() {
      this.addMissingDays();
      this.addMissingRows();
    },
    to() {
      this.addMissingDays();
      this.addMissingRows();
    }
  },
  beforeMount() {
    this.debouncedWrite = debounce(1000, this.writeToDatabase);
  },
  async mounted() {
    var savedName = localStorage.meKey;
    if (savedName) {
      this.meName = savedName;
    }

    if (this.$route.query?.id) {
      this.databaseKey = this.$route.query?.id;
    }

    this.initialDownload();

    setInterval(() => {
      this.nowTimestamp = Date.now();//Refresh editing lock
    }, 1000);
  },
  computed: {
    isChrome() {
      return navigator?.appVersion?.indexOf("Chrome/") ?? false;
    },
    meKey() {
      return this.meName + '|' + randomKey;
    },
    bgClasses() {
      const allBgs = [
        '',
        'bg-amber',
        'bg-blue',
        'bg-blue-grey',
        'bg-brown',
        'bg-cyan',
        'bg-deep-orange',
        'bg-deep-purple',
        'bg-green',
        'bg-grey',
        'bg-indigo',
        'bg-light-blue',
        'bg-light-green',
        'bg-lime',
        'bg-orange',
        'bg-pink',
        'bg-purple',
        'bg-red',
        'bg-teal',
        'bg-yellow',
      ];

      return allBgs;
    },
    nOfRows() {
      return 2 * (parseInt(this.to.HH) - parseInt(this.from.HH));
    },
    dayNames() {
      const weekdayDateMap = {
        Mon: new Date('2020-01-06T00:00:00.000Z'),
        Tue: new Date('2020-01-07T00:00:00.000Z'),
        Wed: new Date('2020-01-08T00:00:00.000Z'),
        Thu: new Date('2020-01-09T00:00:00.000Z'),
        Fri: new Date('2020-01-10T00:00:00.000Z'),
        Sat: new Date('2020-01-11T00:00:00.000Z'),
        Sun: new Date('2020-01-12T00:00:00.000Z'),
      };
      const shortWeekdays = Object.keys(weekdayDateMap);

      const getDayOfWeek = (shortName, locale = 'en-US', length = 'short') =>
        new Intl.DateTimeFormat(locale, { weekday: length }).format(weekdayDateMap[shortName]);

      const getDaysOfWeek = (locale = 'en-US', length = 'short') =>
        shortWeekdays.map(shortName => getDayOfWeek(shortName, locale, length));

      var lang = 'cs-CZ';
      if (typeof window != 'undefined') {
        lang = navigator.language;
      }
      return getDaysOfWeek(lang, 'long');
    }
  },
  methods: {
    goToLink() {
      if (location)
        window?.open(this.nextLink);
    },
    linkDisplay(event) {
      this.nextLink = null;
      if (event.target?.tagName == 'A') {
        this.nextLink = event.target?.href;
      }
    },
    async initialDownload() {
      this.loading = true;
      try {
        this.error = "";
        await this.downloadActivities();
        onValue(ref(db, this.databaseKey), (snapshot) => {
          const data = snapshot.val();
          if (data && this.editDay == 0 && this.quickEditing == false /* not editing currently */) {
            this.updateDisplayedData(data);
          }
        });

        var connectionsRef = ref(db, "/connections/" + this.databaseKey);

        var connectedRef = ref(db, ".info/connected/");
        // Number of online users is the number of objects in the presence list.

        // When the client's connection state changes...
        onValue(connectedRef, async (snap) => {

          // If they are connected..
          if (snap.val()) {

            // Add user to the connections list.
            var con = await push(connectionsRef, true);

            // Remove user from the connection list when they disconnect.
            onDisconnect(con).remove();
          }
        });

        onValue(connectionsRef, (snap) => {
          if (snap.val()) {
            this.connected = snap.size;
          }
        })
      }
      catch (e) {
        this.error = e;
      }
      this.addMissingDays();
      this.addMissingRows();
      this.loading = false;
    },
    touchCell(day, row) {
      this.activities[day].rows[row].touch = Date.now();
      this.activities[day].rows[row].key = this.meKey;

      this.debouncedWrite();
    },
    updateNotes() {
      this.debouncedWrite();
    },
    addMissingDays() {
      var missingDaysCount = this.days - this.activities.length;
      if (missingDaysCount > 0) {
        for (var i = 0; i < missingDaysCount; i++) {
          this.activities.push({
            rows: []
          });
        }
      }
    },
    addMissingRows() {
      for (var i = 0; i < this.days; i++) {
        var day = this.activities[i];
        var missingRowsCount = this.nOfRows - day.rows.length;

        if (missingRowsCount > 0) {
          for (var j = 0; j < missingRowsCount; j++) {
            this.activities[i].rows.push({
              name: '',
              type: 0,
              comment: '',
              touch: 0,
              time: 1
            });
          }
        }
      }
    },
    async writeToDatabase() {
      await set(ref(db, this.databaseKey), {
        activities: this.activities,
        firstDOW: this.firstDOW,
        days: this.days,
        to: this.to,
        from: this.from,
        note: this.note,
        showNotes: this.showNotes,
        showComments: this.showComments,
        maxWidth: this.maxWidth,
        maxHeight: this.maxHeight,
        times: this.times,
        highlights: this.highlights
      });
    },
    async downloadActivities() {
      var snapshot = await get(ref(db, this.databaseKey))
      if (snapshot.exists()) {
        var resultVal = snapshot.val();
        this.updateDisplayedData(resultVal);
      } else {
        console.log("No data available");
      }
    },
    setActivityType(type) {
      this.activities[this.contextDay].rows[this.contextTime].type = type;
      this.debouncedWrite();
    },
    startEdit(day, row, commentNotName) {
      var theActivity = this.activities[day - 1].rows[row - 1];
      if (theActivity.touch < Date.now() - 1000 || theActivity.key == this.meKey) {
        this.commentNotName = commentNotName;
        this.editDay = day;
        this.editRow = row;
      }
      else {
        alert("Někdo tuto buňku právě upravuje.");
      }
    },
    stopEdit() {
      this.editDay = 0;
      this.editRow = 0;
    },
    updateDisplayedData(resultVal) {
      for (var activity of resultVal.activities) {
        for (var row of activity.rows) {
          row.comment = sanitizeHtml(row.comment, options);
          row.name = sanitizeHtml(row.name, options);
        }
      }
      this.activities = resultVal.activities;
      this.days = resultVal.days;
      this.from = resultVal.from;
      this.to = resultVal.to;
      this.firstDOW = resultVal.firstDOW;
      this.showComments = resultVal.showComments ?? this.showComments;
      this.note = resultVal.note || this.note;
      this.showNotes = resultVal.showNotes;
      this.maxWidth = resultVal.maxWidth || this.maxWidth;
      this.maxHeight = resultVal.maxHeight || this.maxHeight;
      this.times = resultVal.times || this.times;
      this.highlights = resultVal.highlights || this.highlights;
    },
    increaseTime(day, row) {
      if (!this.activities[day].rows[row].time) {
        this.activities[day].rows[row].time = 2;
      }
      else {
        this.activities[day].rows[row].time++;
      }
      this.debouncedWrite();
    },
    decreaseTime(day, row) {
      this.activities[day].rows[row].time--;
      this.debouncedWrite();
    },
    changeTimes(row, event) {
      this.times[row] = event.target.value;
      this.debouncedWrite();
    },
    onActivityInput(event, day, row) {
      this.quickEditing = false;
      this.activities[day].rows[row].name = sanitizeHtml(event.target.innerHTML, options);
      this.activities[day].rows[row].touch = Date.now();
      this.activities[day].rows[row].key = this.meKey;

      this.debouncedWrite();
    },
    changeName(event) {
      localStorage.meKey = event.target.value
    }
  },
}
</script>
