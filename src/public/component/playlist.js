const { createElement, createIcon, changeIcon, Icon, toDurationString, Ev, Sort, Key, getFilterText } = require('../lib/common')
const sortBy = require('lodash/sortBy')

class Playlist extends HTMLElement {
    constructor({ songs, name, state, useFilter }, model, controller, view) {
        super()
        this.model = model
        this.controller = controller
        this.view = view
        this.name = name
        this.originalState = state
        this.songs = Object.assign([], songs)
        this.dataset.key = this.name
        this.select = this.view.Select()
        this.sort = Sort.NONE
        this.sortReverse = false
        this.filter = ''
        this.useFilter = useFilter

        this.create()
        this.setActiveRow()
        if (this.controller.sort && this.isActive)
            this.sortBy(this.controller.sort, this.controller.sortReverse)

        if (this.controller.filter && this.isActive)
            this.filterBy(this.controller.filter)




        this.controller.on(Ev.TOGGLE, (id, played) => {
            this.unsetActive()
            if (this.isActive) {
                this.getAllRows.play.forEach(play => changeIcon(play, Icon.PLAY))

                const row = this.getRow(id)
                const play = row ? row.play : null
                this.setActive(this.controller.currentID)
                if (play)
                    changeIcon(play, played ? Icon.PAUSE : Icon.PLAY)
            }
        }, 'playlist')

        this.controller.on([Ev.SORT, Ev.SHUFFLE, Ev.ADD_QUEUE, Ev.REMOVE_QUEUE, Ev.PLAY_NEXT], _ => {
            if (this.name === Key.NOW_PLAYING)
                this.reset()
        }, 'playlist')



        this.model.on(Ev.FAV, (id, added) => {
            const songExist = this.model.isSongInDB({ id })
            const row = this.getRow(id)

            if (songExist && row)
                changeIcon(row.fav, added ? Icon.FAVORITE : Icon.FAVORITE_BORDER)

            const song = this.model.getSongByID(id)

            if (this.controller.isCurrentView(Key.FAV) && this.name === Key.FAV) {
                if (added) {
                    controller.add(song, Key.FAV, true)
                    this.addRow(song)
                }
                else {
                    controller.remove(id)
                    this.removeRow(id)
                }
            }
            else if (this.controller.isCurrentView(Key.FAV)) {
                if (added)
                    controller.add(song, Key.FAV, true)
                else
                    controller.remove(id)
            }
            else if (this.name === Key.FAV) {
                if (added)
                    this.addRow(song)
                else
                    this.removeRow(id)
            }


        }, 'playlist')

        this.model.on(Ev.ADD_SONG, songs => {
            if (this.controller.isCurrentView(Key.MUSIC) && this.name === Key.MUSIC) {
                controller.add(songs, Key.MUSIC, true)
                this.addRow(songs)
            }
            else if (this.controller.isCurrentView(Key.MUSIC)) {
                controller.add(songs, Key.MUSIC, true)
            }
            else if (this.name === Key.MUSIC) {
                this.addRow(songs)
            }
        }, 'playlist')

        this.model.on(Ev.REMOVE_SONG, song => {
            controller.remove(song.id)
            this.removeRow(song.id)

        }, 'playlist')

        this.model.on(Ev.REMOVE_FOLDER, songs => {

            for (const song of songs) {
                if (this.controller.isCurrentView(Key.MUSIC) && this.name === Key.MUSIC) {
                    controller.remove(song.id)
                    this.removeRow(song.id)
                }
                else if (this.controller.isCurrentView(Key.MUSIC)) {
                    controller.remove(song.id)
                }
                else if (this.name === Key.MUSIC) {
                    this.removeRow(song.id)
                }
            }

        }, 'playlist')

        this.model.on(Ev.ADD_SONG_TO_PLAYLIST, (songID, playlistID) => {

            const song = this.model.getSongByID(songID)
            const key = Key.PLAYLIST(playlistID)

            if (this.controller.isCurrentView(key) && this.name === key) {
                controller.add(song, key)
                this.addRow(song, false)
            }
            else if (this.controller.isCurrentView(key)) {
                controller.add(song, key)
            }
            else if (this.name === key) {
                this.addRow(song, false)
            }

        }, 'playlist')

        this.model.on(Ev.REMOVE_SONG_FROM_PLAYLIST, (songID, playlistID) => {

            const key = Key.PLAYLIST(playlistID)
            if (this.controller.isCurrentView(key) && this.name === key) {
                controller.remove(songID)
                this.removeRow(songID)
            }
            else if (this.controller.isCurrentView(key)) {
                controller.remove(songID)
            }
            else if (this.name === key) {
                this.removeRow(songID)
            }
        }, 'playlist')

        this.model.on(Ev.UPDATE, (songID, metadata) => {
            this.updateRow(songID, metadata)
        }, 'playlist')

    }

    get getAllRows() {
        const rows = Array.from(this.querySelectorAll('tr'))

        return {
            play: rows.map(row => row.querySelector('.play i')),
            fav: rows.map(row => row.querySelector('.fav i')),
            title: rows.map(row => row.querySelector('.title')),
            artist: rows.map(row => row.querySelector('.artist')),
            album: rows.map(row => row.querySelector('.album')),
            duration: rows.map(row => row.querySelector('.duration')),
            root: rows
        }

    }

    get isActive() {
        return this.controller.isCurrentView(this.name)
    }

    get isPlaylist() {
        return this.name.includes('playlist-')
    }

    get getPlaylistID() {
        if (this.isPlaylist)
            return this.name.replace('playlist-', '')
        return null
    }

    get visibleRows() {
        return Array.from(this.querySelectorAll('tr')).filter(e => !(e.style.display === 'none'))
    }





    addRow(songs, unshift = true) {
        const rows = this.createRow(songs)

        for (const row of rows.reverse()) {
            if (unshift)
                this.tbody.insertBefore(row, this.tbody.firstChild)
            else
                this.tbody.appendChild(row)
        }
    }

    removeRow(id) {
        const row = this.getRow(id)
        if (row)
            row.root.remove()
    }

    getRow(id) {
        const row = this.querySelector(`tr[data-id="${id}"]`)
        if (row) {
            return {
                play: row.querySelector('.play i'),
                fav: row.querySelector('.fav i'),
                title: row.querySelector('.title'),
                artist: row.querySelector('.artist'),
                album: row.querySelector('.album'),
                duration: row.querySelector('.duration'),
                root: row
            }
        }
    }

    updateRow(id, metadata) {
        const row = this.getRow(id)

        if (row) {
            row.title.innerText = metadata.title
            row.album.innerHTML = metadata.album
            row.artist.innerHTML = ''
            row.album.onclick = _ => metadata.album ? this._openAlbum(metadata.album, metadata.albumartist) : null
            metadata.artists.map(artist => createElement('span', {
                text: artist,
                on: {
                    click: _ => this._openArtist(artist)
                }
            })).forEach(artist => row.artist.appendChild(artist))
        }
    }

    unhiddeRows() {
        const rows = this.getAllRows.root
        const ROW_HEIGHT = 47.8


        const height = rows.length * ROW_HEIGHT
        this.table.attributeStyleMap.set('min-height', CSS.px(height))

        const unhiddeRow = _ => {
            const contentHeight = this.view.Node.section.scrollTop + this.view.Node.section.offsetHeight
            const count = Math.round(contentHeight / ROW_HEIGHT)
            rows.forEach((row, key) => {
                if (count > key && row.hidden)
                    row.hidden = false
            })
        }
        unhiddeRow()
        const listener = _ => {
            unhiddeRow()
            if (!rows.filter(row => row.hidden).length)
                this.view.Node.section.onscroll = null
        }

        this.view.Node.section.onscroll = listener
        window.onresize = listener

    }

    unhiddeAllRows() {
        const rows = this.getAllRows.root.filter(row => row.hidden)
        if (rows.length)
            rows.forEach(row => row.hidden = false)

        this.table.attributeStyleMap.delete('min-height')
    }

    setActive(id) {
        const row = this.getRow(id)
        this.unsetActive()
        if (row && this.isActive)
            row.root.classList.add('active')
    }

    setActiveRow() {
        if (this.isActive) {
            const row = this.getRow(this.controller.currentID)

            if (row) {
                this.setActive(this.controller.currentID)
                changeIcon(row.play, this.controller.isPaused ? Icon.PLAY : Icon.PAUSE)
            }
        }
    }

    unsetActive() {
        const rows = this.getAllRows.root
        rows.forEach(row => row.classList.remove('active'))
    }

    createHead(title = '', sort) {
        this.sortIcon = createIcon(Icon.NONE, {
            data: {
                sort
            }
        })
        return createElement('th', {
            text: title,
            child: sort ? this.sortIcon : null,
            on: {
                click: _ => {
                    if (sort) {
                        if (this.sort === Sort.NONE || this.sort !== sort)
                            this.sortBy(sort)
                        else if (!this.sortReverse)
                            this.sortBy(sort, true)
                        else
                            this.sortBy(Sort.NONE)
                    }
                }
            }
        })
    }

    createRow(songs, hidden = false) {
        if (!(songs instanceof Array))
            songs = [songs]

        const isPlaylist = this.isPlaylist
        const playlistID = this.getPlaylistID

        const rows = []
        for (const song of songs) {

            const selectOptions = [
                {
                    title: _ => this.controller.currentID === song.id && this.isActive && !this.controller.isPaused ? 'Pause' : 'Play',
                    onClick: _ => this._toggle(song.id)
                },
                {
                    title: _ => this.model.isFav(song.id) ? 'Remove from favorite' : 'Add to favorite',
                    onClick: _ => this.model.toggleFav(song.id)
                },
                {
                    title: 'Add to queue',
                    visible: !this.controller.has(song.id),
                    onClick: _ => this.controller.add(song, this.name)
                },
                {
                    title: 'Play next',
                    onClick: _ => this.controller.playNext(song, this.name)
                },
                {
                    title: 'Add to',
                    disabled: _ => !this.model.playlists.length,
                    sub: this.model.playlists.map(playlist => ({
                        title: _ => playlist.name,
                        disabled: _ => playlist.songs.includes(song.id),
                        onClick: _ => this.model.addSongToPlaylist(song.id, playlist.id)
                    }))
                },
                {
                    visible: isPlaylist,
                    title: 'Remove from playlist',
                    onClick: _ => this.model.removeSongFromPlaylist(song.id, playlistID),
                },
                {
                    title: 'Remove',
                    onClick: _ => song.folder ? this.model.disableSong(song.id) : this.model.removeSong(song.id)
                }
            ]

            const row = createElement('tr', {
                data: {
                    id: song.id
                },
                attr: {
                    tabindex: 1,
                },
                prop: {
                    hidden,
                    draggable: true,
                },
                child: [
                    createElement('td.play', {
                        child: createIcon(Icon.PLAY, {
                            on: {
                                click: _ => this._toggle(song.id)
                            }
                        })
                    }),
                    createElement('td.fav', {
                        child: createIcon(this.model.isFav(song.id) ? Icon.FAVORITE : Icon.FAVORITE_BORDER, {
                            on: {
                                click: _ => this.model.toggleFav(song.id)
                            }
                        })
                    }),
                    createElement('td.title', {
                        text: song.metadata.title
                    }),
                    createElement('td.artist', {
                        child: song.metadata.artists.map(artist => createElement('span', {
                            text: artist,
                            on: {
                                click: _ => this._openArtist(artist)
                            }
                        }))
                    }),
                    createElement('td.album', {
                        text: song.metadata.album,
                        prop: {
                            onclick: _ => {
                                if (song.metadata.album)
                                    this._openAlbum(song.metadata.album, song.metadata.albumartist)
                            }
                        }
                    }),
                    createElement('td.options', {
                        child: createIcon(Icon.MORE_HORIZ, {
                            on: {
                                click: e => {
                                    const { top, left, height } = e.target.getBoundingClientRect()
                                    this.select.open(selectOptions, top + height, left)
                                }
                            }
                        })
                    }),
                    createElement('td.duration', {
                        text: toDurationString(song.metadata.duration)
                    })
                ],
                on: {
                    dblclick: e => {
                        if (e.target.tagName !== 'I')
                            this.play(song.id)
                    },
                    keydown: e => {
                        if (e.code === 'Enter')
                            this.play(song.id)
                    },
                    contextmenu: e => {
                        this.select.open(selectOptions, e.clientY, e.clientX)
                    }
                }
            })
            rows.push(row)
        }

        return rows
    }

    create() {
        const rows = this.createRow(this.songs, true)
        this.tbody = createElement('tbody', rows)
        this.filterElement = createElement('input', {
            on: {
                input: _ => this.filterBy(this.filterElement.value)
            },
            prop: {
                placeholder: 'Filter'
            }
        })

        this.noresult = createElement('.noresult', 'No result')

        this.table = createElement('table', {
            append: this,
            child: [
                this.useFilter ? this.filterElement : null,
                createElement('thead', [
                    this.createHead(),
                    this.createHead(),
                    this.createHead('Title', Sort.TITLE),
                    this.createHead('Artist', Sort.ARTIST),
                    this.createHead('Album', Sort.ALBUM),
                    this.createHead(),
                    this.createHead()
                ]
                ),
                this.tbody,
                this.noresult
            ]
        })

        this.unhiddeRows()
    }

    reset() {
        this.tbody.innerHTML = ''
        const songs = this.originalState().songs
        this.songs = songs
        const rows = this.createRow(this.songs)
        for (const row of rows)
            this.tbody.appendChild(row)

        this.setActiveRow()
    }




    filterBy(value) {
        const text = getFilterText(value)
        if (typeof text === 'string' && text) {


            const filterList = this.getAllRows.root.map(row => {
                row.attributeStyleMap.delete('display')
                const id = row.dataset.id
                const song = this.model.getSongByID(id)
                const artist = song.metadata.artists.join('') || song.metadata.albumartist || ''
                const data = song.metadata.title + artist + song.metadata.album
                return {
                    text: getFilterText(data),
                    id,
                    row
                }
            })

            filterList.forEach(song => {
                if (!song.text.includes(text))
                    song.row.attributeStyleMap.set('display', 'none')
            })

            this.filter = text
        }
        else {
            this.getAllRows.root.forEach(row => {
                row.attributeStyleMap.delete('display')
            })
            this.filter = ''
        }



        if (this.isActive)
            this.controller.filterBy(this.filter)
        this.filterElement.value = text

        if (!this.visibleRows.length)
            this.noresult.classList.add('show')
        else
            this.noresult.classList.remove('show')

        this.unhiddeAllRows()
    }

    sortBy(type, reverse = false) {
        this.resetSortIcons()
        const sortIcon = this.getSortIcon(type)
        switch (type) {
            case Sort.TITLE:
            case Sort.ARTIST:
            case Sort.ALBUM:
                const sortList = this.getAllRows.root.map((row, key) => {
                    row.attributeStyleMap.delete('order')
                    row.setAttribute('tabindex', key + 1)

                    const id = row.dataset.id
                    const song = this.model.getSongByID(id)
                    return {
                        title: song.metadata.title,
                        artist: song.metadata.albumartist || song.metadata.artists.join(' '),
                        album: song.metadata.album,
                        id,
                        row
                    }
                })

                const sorted = sortBy(sortList, [type])
                if (reverse)
                    sorted.reverse()

                sorted.forEach((song, key) => {
                    song.row.attributeStyleMap.set('order', key)
                    song.row.setAttribute('tabindex', key + 1)
                })

                if (reverse)
                    changeIcon(sortIcon, Icon.EXPAND_LESS)
                else
                    changeIcon(sortIcon, Icon.EXPAND_MORE)

                this.sort = type
                this.sortReverse = reverse

                break
            case Sort.NONE:
                this.getAllRows.root.map((row, key) => {
                    row.attributeStyleMap.delete('order')
                    row.setAttribute('tabindex', key + 1)
                })
                this.resetSortIcons()
                this.sort = type
                this.sortReverse = false
                break
        }
        this.unhiddeAllRows()

    }

    getSortIcon(sort) {
        return this.querySelector(`i[data-sort="${sort}"]`)
    }

    resetSortIcons() {
        this.querySelectorAll('th i').forEach(i => {
            changeIcon(i, Icon.NONE)
        })
    }

    removeListeners() {
        this.model.removeAllEventListeners('playlist')
        this.controller.removeAllEventListeners('playlist')
    }


    play(id) {
        if (!this.isActive) {
            const songs = this.originalState().songs || this.songs
            this.controller.set(songs, this.name)
            this.controller.play(id)
        }
        else if (this.controller.has(id)) {
            this.controller.play(id)
        }

    }

    _openArtist(artist) {
        const renderArtist = Render.ARTIST(artist)
        if (this.view.Node.outlet.location !== renderArtist)
            this.view.Node.outlet.render(renderArtist, artist)
    }

    _openAlbum(album, albumartist) {
        const renderAlbum = Render.ALBUM(album)
        if (this.view.Node.outlet.location !== renderAlbum)
            this.view.Node.outlet.render(renderAlbum, album, albumartist)
    }

    _toggle(id) {
        if (this.isActive) {
            if (this.controller.isCurrentID(id))
                this.controller.toggle()
            else
                this.controller.play(id)
        }
        else {
            this.play(id)
        }

        if (this.isActive)
            this.controller.sortBy(this.sort, this.sortReverse)
        if (this.filter && !this.controller.filter)
            this.filterBy(this.filter)
    }
}


customElements.define('playlist-component', Playlist)
module.exports = Playlist