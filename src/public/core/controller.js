const find = require('lodash/find')
const remove = require('lodash/remove')
const findIndex = require('lodash/findIndex')
const cloneDeep = require('lodash/cloneDeep')
const sortBy = require('lodash/sortBy')
const isPlainObject = require('lodash/isPlainObject')
const EventEmitter = require('../lib/event')
const { Ev, Err, Sort, Key, getFilterText } = require('../lib/common')

class Controller extends EventEmitter {
    constructor(model) {
        super({
            logError: true
        })

        this.REPEAT = 'repeat'
        this.NO_REPEAT = 'no_repeat'
        this.REPEAT_ALL = 'repeat_all'

        this.model = model

        this._queue = []
        this._originalQueue = []
        this._current = {}
        this._audio = new Audio()

        this._shuffle = false
        this._repeat = this.NO_REPEAT
        this._sort = Sort.NONE
        this._sortReverse = false
        this._filter = false

        this._audio.addEventListener('ended', _ => {
            switch (this.repeat) {
                case this.REPEAT:
                    this.play(this.currentID)
                    break
                case this.REPEAT_ALL:
                    this.next()
                    break
                case this.NO_REPEAT:
                    const lastID = this._queue[this._queue.length - 1].id
                    if (lastID === this.currentID)
                        this.play(null, true)
                    else
                        this.next()
            }
        })
        document.body.dataset.play = false

        this._audio.addEventListener('play', _ => {
            this.dispatchEvent(Ev.PLAY, this.currentID)
            this.dispatchEvent(Ev.TOGGLE, this.currentID, true)
            model.countSong(this.currentID)
            if (this.currentView !== Key.RECENTS)
                model.addRecent(this.currentID)

            document.body.dataset.play = true
        })

        this._audio.addEventListener('pause', _ => {
            this.dispatchEvent(Ev.PAUSE, this.currentID)
            this.dispatchEvent(Ev.TOGGLE, this.currentID, false)
            document.body.dataset.play = false
        })

        this._audio.addEventListener('timeupdate', _ => this.dispatchEvent(Ev.TIME))
        this._audio.addEventListener('loadedmetadata', _ => this.dispatchEvent(Ev.LOAD))
        this._audio.addEventListener('canplay', _ => this.dispatchEvent(Ev.CAN_PLAY))
        this._audio.addEventListener('error', _ => {
            if (this.currentID)
                this.model.disableSong(this.currentID)

            if (this._queue.length)
                this.dispatchEvent(Ev.ERROR)
        })
        this._audio.addEventListener('loadstart', _ => this.dispatchEvent(Ev.LOAD_START))
        this._audio.addEventListener('volumechange', _ => this.dispatchEvent(Ev.VOLUME))

        this.model.on(Ev.REMOVE_SONG, song => {
            if (this.currentID === song.id && this._queue.length > 1)
                this.next()
            this.remove(song.id)
        })

        this.model.on(Ev.REMOVE_FOLDER, songs => {
            const ids = songs.map(song => song.id)
            if (ids.includes(this.currentID) && this._queue.length > 1)
                this.next(true)
            this.remove(ids)
        })

        this.on(Ev.REMOVE_QUEUE, ids => {
            if (this.queue.length) {
                if (ids.includes(this.currentID) && this._queue.length > 1)
                    this.next()
            }
            else {
                this._clear()
            }
        })
    }

    set current(value) {
        if (isPlainObject(value) && 'id' in value && 'view' in value)
            this._current = value
        else
            this._current = {}
    }

    get current() {
        if (isPlainObject(this._current) && 'id' in this._current && 'view' in this._current)
            return cloneDeep(this._current)
        return {}
    }

    get queue() {
        return cloneDeep(this._queue)
    }
    get queueIDs() {
        return this._queue.map(queue => queue.id)
    }

    get originalQueue() {
        return cloneDeep(this._originalQueue)
    }

    get filteredQueue() {
        return this._queue.filter(q => !q.disabled)
    }

    get filteredQueueIDs() {
        return this.filteredQueue.map(queue => queue.id)
    }

    get currentID() {
        return this.current.id
    }

    get currentView() {
        return this.current.view
    }

    get currentSong() {
        return this.model.getSongByID(this.currentID)
    }

    get repeat() {
        return this._repeat
    }

    get sort() {
        return this._sort
    }

    get sortReverse() {
        return this._sortReverse
    }

    get filter() {
        return this._filter
    }

    get shuffle() {
        return this._shuffle
    }

    get volume() {
        return this._audio.volume
    }

    get time() {
        return this._audio.currentTime
    }

    get duration() {
        return this._audio.duration
    }

    get hasSrc() {
        return !!this._audio.src
    }

    get isPaused() {
        return this._audio.paused
    }

    get error() {
        return this._audio.error
    }

    get ended() {
        return this._audio.ended
    }

    get queueData() {
        const songs = {}
        this._originalQueue.forEach(song => {
            if (song.view in songs)
                songs[song.view].push(song.id)
            else
                songs[song.view] = [song.id]
        })

        return songs
    }


    set(songs, viewName) {

        this._set(songs, viewName)

        if (this._shuffle)
            this._shuffleQueue()

        if (!songs.length)
            this.dispatchEvent(Ev.EMPTY_PLAYLIST, viewName)
    }

    add(songs, viewName, unshift = false) {
        if (!(songs instanceof Array))
            songs = [songs]

        const queueObject = songs
            .map(a => ({ id: typeof a === 'object' ? a.id : a, view: viewName }))
            .filter(({ id }) => this.model.isSongInDB({ id }) && !this.has(id))

        if (queueObject.length) {
            if (unshift)
                this._queue.unshift(...queueObject)
            else
                this._queue.push(...queueObject)

            this._updateOriginal()
            this.dispatchEvent(Ev.ADD_QUEUE, queueObject)
        }
        else {
            this.dispatchError(Ev.ADD_QUEUE, Err.CANT_ADD_QUEUE, songs)
        }

        if (!songs.map(a => a.id ? typeof a.id : typeof a).every(a => 'string'))
            console.warn('WARNING: Cannot add invalid id to queue')

        if (!viewName)
            console.warn('you should use viewName when adding song to queue')

        return this
    }

    remove(songs) {
        if (!(songs instanceof Array))
            songs = [songs]
        const ids = songs.map(a => a.id || a)

        if (ids.length) {
            for (const id of ids)
                remove(this._queue, { id })
            this._updateOriginal()
            this.dispatchEvent(Ev.REMOVE_QUEUE, ids)
        }

        if (!songs.map(a => a.id ? typeof a.id : typeof a).every(a => 'string'))
            console.warn('WARNING: Cannot remove invalid id to queue')

        return this
    }

    has(id) {
        return !!this.get(id)
    }

    get(id) {
        return find(this._queue, { id })
    }

    isCurrentView(name) {
        if (name === 'nowPlaying')
            return true

        if (!this.current)
            return false
        return this.currentView === name
    }

    isCurrentID(id) {
        return this.currentID === id
    }

    moveUp(id) {
        this._move(id, -1)
        return this
    }

    moveDown(id) {
        this._move(id, 1)
        return this
    }

    playNext(songs, viewName) {
        const ids = songs instanceof Array ? songs.map(song => song.id || song) : [songs.id || songs]
        if (this._queue.length) {
            for (const id of ids.reverse()) {
                if (this.currentID !== id) {
                    this.remove(id)
                    const pos = findIndex(this._queue, this.current) + 1
                    this._queue.splice(pos, 0, {
                        id,
                        view: viewName
                    })
                    this.dispatchEvent(Ev.PLAY_NEXT, id)
                    this._update(this._queue)
                }
            }
        }
        else {
            this.set(ids, viewName)
            this.play()
        }
    }



    play(id, pause = false) {
        if (this.has(id))
            this._playSong(this.get(id), pause)
        else if (this._queue.length)
            this._playSong(this._queue[0], pause)
        else
            this._clear()

        return this
    }

    pause(pause = true) {
        if (pause)
            this._audio.pause()

        return this
    }

    toggle(paused = this.isPaused) {
        if (this.hasSrc) {
            if (paused)
                this._audio.play()
            else
                this._audio.pause()
        }
        return this
    }


    toggleShuffle(shuffle) {

        const shuffled = typeof shuffle === 'boolean' ? shuffle : this._shuffle

        if (shuffled) {
            this._setOriginalQueue()
            this._setShuffle(false)
            if (this._sort && this._sort !== Sort.NONE)
                this.sortBy(this._sort, this._sortReverse)
        }
        else {
            this._shuffleQueue()
            this._setShuffle(true)
            // if(this._sort && this._sort !== Sort.NONE)
            //     this.sortBy(this._sort, this._sortReverse)
        }

        return this
    }


    next(pause = false) {
        if (this.current) {
            const index = findIndex(this.filteredQueue, this.current)
            let next = index + 1

            if (next >= this.filteredQueue.length)
                next = 0

            if (this.repeat === this.REPEAT)
                this.setRepeat(this.REPEAT_ALL)

            if (this.filteredQueue[next])
                this.play(this.filteredQueue[next].id, pause)
        }
        else {
            this.play(undefined, pause)
        }
        return this

    }

    prev() {
        if (this.current) {
            const index = findIndex(this.filteredQueue, this.current)
            const prev = Math.max(0, index - 1)

            if ((this._audio.currentTime > 5 || this._shuffle) && this.current)
                this.play(this.currentID)
            else if (this.filteredQueue[prev])
                this.play(this.filteredQueue[prev].id)
        }
        return this
    }


    setRepeat(type) {
        switch (type) {
            case this.REPEAT:
            case this.REPEAT_ALL:
            case this.NO_REPEAT:
                this._repeat = type
                this.dispatchEvent(Ev.REPEAT, type)
                break
            default:
                this.dispatchError(Ev.REPEAT, Err.INVALID_TYPE_OF_REPEAT, type)
        }

        return this
    }

    toggleRepeat() {
        switch (this.repeat) {
            case this.REPEAT:
                this.setRepeat(this.NO_REPEAT)
                break
            case this.NO_REPEAT:
                this.setRepeat(this.REPEAT_ALL)
                break
            case this.REPEAT_ALL:
                this.setRepeat(this.REPEAT)
                break
        }

        return this
    }

    setVolume(volume) {
        volume = Math.max(Math.min(1, volume), 0)
        if (Number.isFinite(volume))
            this._audio.volume = volume
    }

    increaseVolume() {
        this.setVolume(this.volume + .2)
    }

    decreaseVolume() {
        this.setVolume(this.volume - .2)
    }

    setTime(state) {
        if (Number.isFinite(state))
            this._audio.currentTime = getValue(0, this.duration, state)
    }


    sortBy(type, reverse = false) {
        switch (type) {
            case Sort.ARTIST:
            case Sort.ALBUM:
            case Sort.TITLE:
                const songs = this._queue.map(({ id, view, disabled }) => {
                    const song = this.model.getSongByID(id)
                    return {
                        title: song.metadata.title,
                        artist: song.metadata.albumartist || song.metadata.artists.join(' '),
                        album: song.metadata.album,
                        id,
                        view,
                        disabled
                    }
                })
                const sorted = sortBy(songs, [type])
                    .map(({ id, view, disabled }) => ({ id, view, disabled }))

                if (reverse)
                    sorted.reverse()

                this._update(sorted, false)
                this._sort = type
                this._sortReverse = reverse
                this.dispatchEvent(Ev.SORT, type)
                break
            case Sort.NONE:
                this._setOriginalQueue()
                this._sort = type
                this._sortReverse = false
                this.dispatchEvent(Ev.SORT, type)
                break
            default:
                this.dispatchError(Ev.SORT, Err.INVALID_TYPE_OF_SORT, type)
        }
        return this
    }

    filterBy(value) {
        const text = getFilterText(value)
        if (text) {
            const songs = this._queue.map(({ id, view }) => {
                const song = this.model.getSongByID(id)
                const artist = song.metadata.artists.join('') || song.metadata.albumartist || ''
                const data = song.metadata.title + artist + song.metadata.album
                return {
                    text: getFilterText(data),
                    id,
                    view
                }
            })

            const filtered = songs.map(song => {
                if (song.text.includes(text))
                    return { id: song.id, view: song.view }
                else
                    return { id: song.id, view: song.view, disabled: true }
            })
            this._update(filtered)
            this._filter = text
        }
        else {
            const unfiltered = this._queue.map(({ id, view }) => ({ id, view }))
            this._update(unfiltered)
            this._filter = false
        }

        this.dispatchEvent(Ev.FILTER, text)

        return this
    }

    _setShuffle(shuffle = true) {
        this._shuffle = shuffle
        this.dispatchEvent(Ev.SHUFFLE, shuffle)
    }

    _clear() {
        this._audio.src = ''
        this.current = {}
        this.dispatchEvent(Ev.RESET)
        return this
    }

    async _playSong(current, pause = false) {
        const song = this.model.getSongByID(current.id)
        if (song) {
            this._audio.src = song.path
            this.current = current
            try {
                await this._audio.play()
                if (pause)
                    this._audio.pause()
            }
            catch (err) {
                console.warn(err)
            }
        }
    }


    _set(queue, viewName) {
        if (queue instanceof Array) {
            this.toggleShuffle(true)
            const newQueue = queue
                .map(a => ({ id: a.id || a, view: viewName }))
                .filter(a => this.model.isID(a.id))
            this._update(newQueue)
            this._filter = false
            this._sort = Sort.NONE
            this._sortReverse = false
        }
        else {
            this.dispatchError(Ev.SET_QUEUE, Err.INVALID_QUEUE, queue)
        }

        if (!queue.map(a => a.id ? typeof a.id : typeof a).every(a => 'string'))
            console.warn('WARNING: Cannot Set invalid id to queue')

        return this
    }

    _update(queue, update = true) {
        this._queue = cloneDeep(queue)
        if (update)
            this._updateOriginal()
        this.dispatchEvent(Ev.SET_QUEUE, queue)
    }


    _move(id, moveBy) {
        const from = findIndex(this._queue, { id })
        const to = Math.min(Math.max(0, (from + moveBy)), this._queue.length - 1)
        this._queue.splice(to, 0, this._queue.splice(from, 1)[0])
        this._update(this._queue)
    }

    _updateOriginal() {
        this._originalQueue = cloneDeep(this._queue)
    }

    _setOriginalQueue() {
        this._update(this._originalQueue, false)
    }

    _shuffleQueue() {
        const array = cloneDeep(this.filteredQueue)
        if (this.current)
            remove(array, this.current)
        let currentIndex = array.length

        while (0 !== currentIndex) {

            const randomIndex = Math.floor(Math.random() * currentIndex)
            currentIndex -= 1

            const temporaryValue = array[currentIndex]
            array[currentIndex] = array[randomIndex]
            array[randomIndex] = temporaryValue
        }

        if (this.current)
            array.unshift(this.current)
        this._update(array, false)
        return this
    }
}


module.exports = Controller