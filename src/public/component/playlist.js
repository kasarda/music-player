const { createElement, createIcon, changeIcon } = require('../lib/query')
const { Icon, Event, Sort, toDurationString, getImmutable } = require('../lib/common')
const Select = require('./select')

class PlaylistComponent extends HTMLElement {
    constructor(songs, select) {
        super()
        songs = songs.filter(song => {
            return Object.values(song.metadata).length
        })

        /* Properties */
        const reverseSongs = getImmutable(songs, true)

        this._songs = getImmutable(reverseSongs, true)
        this._sorted = getImmutable(reverseSongs, true)
        this._filtered = getImmutable(reverseSongs, true)
        this.data = getImmutable(reverseSongs, true)
        this._select = select

        this.sort = {
            type: null,
            index: null
        }

        this.header = [
            {
                width: '50%',
            },
            {
                text: 'Title',
                width: '200%',
                sort: true,
                name: 'title'
            },
            {
                text: 'Artist',
                sort: true,
                name: 'artist'
            },
            {
                text: 'Album',
                sort: true,
                name: 'album'
            },
            {
                icon: Icon.TIME,
                width: '50%',
                sort: true,
                name: 'duration'
            },
            {
                width: '50%'
            }
        ]

        /* Events */
        this._addSongEvent = new CustomEvent(Event.ADD_SONG, { detail: {} })
        this._removeSongEvent = new CustomEvent(Event.REMOVE_SONG, { detail: {} })
        this._addFavSongEvent = new CustomEvent(Event.ADD_FAV, { detail: {} })
        this._removeFavSongEvent = new CustomEvent(Event.REMOVE_FAV, { detail: {} })
        this._sortEvent = new CustomEvent(Event.SORT, { detail: {} })
        this._filterEvent = new CustomEvent(Event.FILTER, { detail: {} })
        this._rowClickEvent = new CustomEvent(Event.ROW_CLICK, { detail: {} })
        this._changeEvent = new CustomEvent(Event.CHANGE, { detail: {} })

        /* DOM */
        const table = createElement('table')
        const head = createElement('thead')
        this._body = createElement('tbody')
        this._headRow = createElement('tr')

        this._noresult = createElement('.noresult', {
            text: 'No result'
        })

        this._renderHead()
        this._renderBody()

        head.appendChild(this._headRow)
        table.appendChild(head)
        table.appendChild(this._body)
        table.appendChild(this._noresult)
        this.appendChild(table)
    }
    addSong(song, insertBefore = true) {
        song = getImmutable(song, true)

        if (insertBefore)
            this._unshiftData(song)
        else
            this._pushData(song)

        this._addRow(song, insertBefore)
        Object.assign(this._addSongEvent.detail, song)
        this.dispatchEvent(this._addSongEvent)
        this.dispatchEvent(this._changeEvent)
    }

    removeSong(id) {
        this._removeData(id)
        this._bodyRows.forEach(row => {
            if (row.dataset.id === id) {
                row.remove()
                Object.assign(this._removeSongEvent.detail, id)
                this.dispatchEvent(this._removeSongEvent)
                this.dispatchEvent(this._changeEvent)
            }
        })
    }

    addFav(id, dispatchEvent = true) {
        const song = this.getSong(id)
        if (song) {
            const row = this.getRow(id)
            if (row) {
                const icon = row.querySelector('td i')
                changeIcon(icon, Icon.FAVORITE)
            }
            this._updateData(id, { fav: true })

            if (dispatchEvent) {
                Object.assign(this._addFavSongEvent.detail, song)
                this.dispatchEvent(this._addFavSongEvent)
            }
        }
    }

    removeFav(id, dispatchEvent = true) {
        const song = this.getSong(id)
        if (song) {
            const row = this.getRow(id)
            if (row) {
                const icon = row.querySelector('td i')
                changeIcon(icon, Icon.FAVORITE_BORDER)
            }
            this._updateData(id, { fav: false })

            if (dispatchEvent) {
                Object.assign(this._removeFavSongEvent.detail, song)
                this.dispatchEvent(this._removeFavSongEvent)
            }
        }
    }


    getSong(id) {
        return this._songs.filter(song => song.id === id)[0]
    }

    getRow(id) {
        let returnRow
        this._bodyRows.forEach(row => {
            if (row.dataset.id === id)
                returnRow = row
        })
        return returnRow
    }


    filter(text) {
        text = text.toLowerCase().replace(/ /g, '')

        const rows = this._bodyRows
        const filtered = getImmutable(this._sorted, true)
            .filter(song => {
                const filterText = (song.metadata.title + song.metadata.artist + song.metadata.album).toLowerCase().replace(/ /g, '')
                let state = true
                rows.forEach(row => {
                    if (row.dataset.id === song.id) {
                        if (!filterText.includes(text)) {
                            row.style.display = 'none'
                            state = false
                        }
                        else {
                            state = true
                            row.style.display = ''
                        }
                    }
                })
                return state
            })


        if (!filtered.length)
            this._noresult.style.display = 'block'
        else
            this._noresult.style.display = 'none'

        this._filtered = filtered
        this.data = filtered
        Object.assign(this._filterEvent.detail, {filter: text, songs: filtered})
        this.dispatchEvent(this._filterEvent)
    }

    sortRows(type, index) {
        this.sort.index = index
        const icon = this._sortIcon

        this._sortedIcons.forEach(sortedIcon => {
            if (!sortedIcon.isSameNode(icon))
                changeIcon(sortedIcon, Icon.NONE)
        })

        const sorted = getImmutable(this._sorted, true)
        sorted.sort((a, b) => {
            const prev = a.metadata[this.header[index].name]
            const next = b.metadata[this.header[index].name]

            if (prev === '')
                return 1
            else if (next === '')
                return -1
            else
                return prev < next ? -1 : prev > next ? 1 : 0
        })


        const rows = this._body.querySelectorAll('tr')

        this.sort.type = type
        function setOrder() {
            sorted.forEach((song, pos) => {
                rows.forEach(row => {
                    if (row.dataset.id === song.id)
                        row.style.order = pos
                })
            })
        }


        switch (type) {
            case Sort.UP:
                changeIcon(icon, Icon.EXPAND_LESS)
                setOrder()
                break
            case Sort.DOWN:
                changeIcon(icon, Icon.EXPAND_MORE)
                sorted.reverse()
                setOrder()
                break
            default:
                changeIcon(icon, Icon.NONE)
                this.sort.index = null
                rows.forEach(row => {
                    row.style.order = ''
                })
        }

        this._sorted = sorted

        this.data = []
        const ids = this._filtered.map(song => song.id)
        sorted.forEach(song => {
            if (ids.includes(song.id))
                this.data.push(getImmutable(song, true))
        })

        Object.assign(this._sortEvent.detail, sorted)
        this.dispatchEvent(this._sortEvent)
        this.dispatchEvent(this._changeEvent)
    }


    _renderBody() {
        this._songs.forEach(song => {
            this._addRow(song)
        })
    }

    _addRow(song, insertBefore = false) {
        const { metadata } = song
        const tr = createElement('tr')

        // fav icon
        const fav_col = createElement('td', {
            style: {
                width: this.header[0].width
            }
        })

        let icon_name = Icon.FAVORITE_BORDER
        if (song.fav)
            icon_name = Icon.FAVORITE

        const fav_icon = createIcon(icon_name)
        fav_col.style.justifyContent = 'center'

        fav_icon.addEventListener('click', _ => {
            if (song.fav)
                this.removeFav(song.id)
            else
                this.addFav(song.id)
        })

        fav_col.appendChild(fav_icon)
        tr.appendChild(fav_col)

        // title
        const title_col = createElement('td', {
            text: metadata.title,
            style: {
                width: this.header[1].width
            }
        })
        tr.appendChild(title_col)

        // artist
        const artist_col = createElement('td', {
            text: metadata.artist,
            style: {
                width: this.header[2].width
            }
        })
        tr.appendChild(artist_col)

        // album
        const album_col = createElement('td', {
            text: metadata.album,
            style: {
                width: this.header[3].width
            }
        })
        tr.appendChild(album_col)

        // duration
        const duration_col = createElement('td', {
            text: toDurationString(metadata.duration),
            style: {
                width: this.header[4].width
            }
        })
        tr.appendChild(duration_col)

        // select
        const select_col = createElement('td', {
            style: {
                width: this.header[5].width
            },
            // todo Add action events
            child: new Select(this._select, song)
        })
        tr.appendChild(select_col)

        tr.dataset.id = song.id
        tr.addEventListener('dblclick', _ => {
            Object.assign(this._rowClickEvent.detail, song)
            this.dispatchEvent(this._rowClickEvent)
        })

        if (insertBefore)
            this._body.insertBefore(tr, this._body.firstElementChild)
        else
            this._body.appendChild(tr)
    }

    _renderHead() {
        this.header.forEach((header, index) => {
            const col = createElement('th')

            /* Icon */
            if (header.icon) {
                const icon = createIcon(`${header.icon}.small`)
                col.appendChild(icon)
            }

            /* Text */
            if (header.text) {
                const text = createElement('span', {
                    text: header.text
                })
                col.appendChild(text)
            }

            /* Sorting */
            if (header.sort) {
                const icon = createIcon('.small.sort')
                col.appendChild(icon)

                col.addEventListener('click', _ => {
                    if (this.sort.index !== index) {
                        this.sort.type = null
                        this.sort.index = null
                    }

                    if (!this.sort.type)
                        this.sortRows(Sort.UP, index)

                    else if (this.sort.type === Sort.UP)
                        this.sortRows(Sort.DOWN, index)

                    else
                        this.sortRows(Sort.DEFAULT, index)

                })
            }


            /* Spacing */
            if (header.width)
                col.style.width = header.width

            this._headRow.appendChild(col)

        })
    }

    _pushData(data) {
        this._songs.push(data)
        this._sorted.push(data)
        this._filtered.push(data)
        this.data.push(data)
    }

    _unshiftData(data) {
        this._songs.unshift(data)
        this._sorted.unshift(data)
        this._filtered.unshift(data)
        this.data.unshift(data)
    }

    _removeData(data) {
        const filter = song => song.id !== data

        this._songs = this._songs.filter(filter)
        this._sorted = this._sorted.filter(filter)
        this._filtered = this._filtered.filter(filter)
        this.data = this.data.filter(filter)
    }

    _updateData(id, data) {
        const map = song => {
            if (song.id === id)
                return Object.assign(song, data)
            return song
        }

        this._songs = this._songs.map(map)
        this._sorted = this._sorted.map(map)
        this._filtered = this._filtered.map(map)
        this.data = this.data.map(map)
    }

    get _headCols() {
        return this._headRow.querySelectorAll('th')
    }

    get _sortedIcons() {
        return this._headRow.querySelectorAll('i.sort')
    }

    get _sortIcon() {
        return this._headRow.querySelector(`th:nth-child(${this.sort.index + 1}) i.sort`)
    }

    get _bodyRows() {
        return this._body.querySelectorAll('tr')
    }

}

customElements.define('playlist-component', PlaylistComponent)
module.exports = PlaylistComponent