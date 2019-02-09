const Ev = {
    ADD_SONG: 'add_song',
    ADD_METADATA: 'add_metadata',
    REMOVE_SONG: 'remove_song',

    ADD_FOLDER: 'add_folder',
    REMOVE_FOLDER: 'remove_folder',

    ADD_PLAYLIST: 'add_playlist',
    REMOVE_PLAYLIST: 'remove_playlist',
    RENAME_PLAYLIST: 'rename_playlist',
    ADD_SONG_TO_PLAYLIST: 'add_song_to_playlist',
    REMOVE_SONG_FROM_PLAYLIST: 'remove_song_from_playlist',
    UPDATE: 'update',
    CHANGE_THEME: 'change_theme',

    ADD_FAV: 'add_fav',
    REMOVE_FAV: 'remove_fav',
    FAV: 'fav',
    RECENT_CHANGE: 'recent_change',

    ADD_QUEUE: 'add_queue',
    REMOVE_QUEUE: 'remove_queue',
    SET_QUEUE: 'set_queue',
    PLAY_NEXT: 'play_next',

    PLAY: 'play',
    PAUSE: 'pause',
    TOGGLE: 'toggle',
    TIME: 'time',
    LOAD: 'load',
    CAN_PLAY: 'can_play',
    ERROR: 'error',
    REPEAT: 'repeat',
    SORT: 'sort',
    SHUFFLE: 'shuffle',
    FILTER: 'filter',
    LOAD_START: 'loadstart',
    VOLUME: 'volumechange',
    RESET: 'reset',
    EMPTY_PLAYLIST: 'empty_playlist'
}

const Err = {
    PLAYLIST_NOT_FOUND: 'Playlist not found',
    SONG_NOT_FOUND: 'Song not found',
    SONG_ALREADY_EXIST: 'Song already exist',
    METADATA: 'Can\'t apply metadata',
    UNSUPPORTED_FILE: 'File is not supported',
    INVALID_NAME: 'Invalid name',
    SONG_IS_ALREADY_FAV: 'Song is already favorite',
    FOLDER_ALREADY_EXIST: 'Folder already exist',
    CANT_ADD_SONG_TO_PLAYLIST: 'Cant add song to playlist',
    CANT_REMOVE_SONG_FROM_PLAYLIST: 'Cant remove song from playlist',
    FOLDER_NOT_FOUND: 'Folder not found',
    FOLDER_IS_SUB_FOLDER: 'Folder is sub folder',
    INVALID_QUEUE: 'Invalid queue value',
    INVALID_TYPE_OF_REPEAT: 'Invalid type of repeat',
    INVALID_TYPE_OF_SORT: 'Invalid type of sort',
    INVALID_FILTER: 'Invalid text in filter',
    CANT_ADD_QUEUE: 'Can\'t add queue'
}


const Icon = {
    FAVORITE: 'favorite',
    FAVORITE_BORDER: 'favorite_border',
    MORE_HORIZ: 'more_horiz',
    EXPAND_LESS: 'expand_less',
    EXPAND_MORE: 'expand_more',
    PLAY: 'play_arrow',
    PAUSE: 'pause',
    SKIP_NEXT: 'skip_next',
    SKIP_PREV: 'skip_previous',
    CLOSE: 'close',
    TIME: 'access_time',
    QUEUE: 'queue_music',
    REPEAT_ALL: 'repeat',
    REPEAT: 'repeat_one',
    NO_REPEAT: 'repeat',
    SHUFFLE: 'shuffle',
    ARROW_RIGHT: 'keyboard_arrow_right',
    ARROW_LEFT: 'keyboard_arrow_left',
    VOLUME_UP: 'volume_up',
    VOLUME_DOWN: 'volume_down',
    VOLUME_MUTE: 'volume_mute',
    VOLUME_OFF: 'volume_off',
    NONE: '',
    ADD: 'add',
    FULLSCREEN: 'fullscreen',
    FULLSCREEN_EXIT: 'fullscreen_exit',
    LINK: 'link',
    size: {
        SMALL: 'small',
        LARGE: 'large'
    }
}


const Outlet = {
    SONGS: 'songs',
    SEARCH: 'search',
    ALBUMS: 'albums',
    ARTISTS: 'artists',
    SETTINGS: 'settings',
    ABOUT: 'about'
}

const Key = {
    MUSIC: 'music',
    FAV: 'fav',
    NOW_PLAYING: 'nowPlaying',
    ALBUMS: 'albums',
    ARTISTS: 'artists',
    SETTINGS: 'settings',
    ABOUT: 'about',
    SEARCH: 'search',
    RECENTS: 'recents',
    MOST_PLAYED: 'mostPlayed',
    PLAYLIST: id => 'playlist-' + id,
    ALBUM: name => 'album-' + name,
    ARTIST: name => 'artist-' + name
}

const Render = {
    MUSIC: Outlet.SONGS + '.' + Key.MUSIC,
    FAV: Outlet.SONGS + '.' + Key.FAV,
    NOW_PLAYING: Outlet.SONGS + '.' + Key.NOW_PLAYING,
    SEARCH: Outlet.SEARCH + '.' + Key.SEARCH,
    ALBUMS: Outlet.ALBUMS + '.' + Key.ALBUMS,
    ARTISTS: Outlet.ARTISTS + '.' + Key.ARTISTS,
    SETTINGS: Outlet.SETTINGS + '.' + Key.SETTINGS,
    ABOUT: Outlet.ABOUT + '.' + Key.ABOUT,
    RECENTS: Outlet.SONGS + '.' + Key.RECENTS,
    MOST_PLAYED: Outlet.SONGS + '.' + Key.MOST_PLAYED,
    PLAYLIST: id => Outlet.SONGS + '.' + Key.PLAYLIST(id),
    ALBUM: name => Outlet.SONGS + '.' + Key.ALBUM(name),
    ARTIST: name => Outlet.SONGS + '.' + Key.ARTIST(name)
}

const Sort = {
    ARTIST: 'artist',
    ALBUM: 'album',
    TITLE: 'title',
    NONE: 'none'
}

function createChunk(space = 1) {
    let array = []
    const events = []
    return {
        get value() {
            return Object.assign([], array)
        },
        get _isFull() {
            return array.length >= space
        },

        get space() {
            return space
        },

        setSpace(newSpace) {
            space = newSpace
        },

        add(value) {
            array.push(value)
            if (this._isFull)
                this._trigger()
        },

        reset() {
            array = []
        },

        onFull(cb) {
            events.push(cb)
        },

        end() {
            if (array.length)
                this._trigger()
        },
        _trigger() {
            events.forEach(cb => cb.call(this, array))
            this.reset()
        }
    }
}

function parseSelector(selector) {
    const selectorList = selector.split(/(\.|\[|#)/)

    const element = selectorList[0] || 'div'
    let a = selectorList.filter((_, key) => key > 0).filter((_, key) => !(key % 2))
    let b = selectorList.filter((_, key) => key > 0).filter((_, key) => key % 2)

    const classNames = []
    let id
    const attr = {}

    a.forEach((item, key) => {
        if (item === '.')
            classNames.push(b[key])
        else if (item === '#' && !id)
            id = b[key]
        else if (item === '[') {
            const attrList = b[key].replace(']', '').split('=')
            attr[attrList[0]] = attrList[1] || ''
        }
    })

    return {
        element,
        classNames,
        id,
        attr
    }
}

function promisify(value, cb) {
    if (value instanceof Promise)
        value.then(val => cb(val))
    else
        cb(value)
}

function createElement(name = '', props = {
    className: null,
    attr: null,
    prop: null,
    data: null,
    style: null,
    child: null,
    text: null,
    html: null,
    src: null,
    on: null,
    append: null,
    prepend: null,
    ref: null,
    ontrigger: null
}, condition) {


    if (arguments.length >= 3 && !condition)
        return null

    const selector = parseSelector(name)

    if (!('document' in self))
        return {
            name,
            props
        }

    const element = document.createElement(selector.element)

    if (selector.classNames.length)
        element.classList.add(...selector.classNames)

    if (selector.id)
        element.setAttribute('id', selector.id)

    for (const attr in selector.attr)
        element.setAttribute(attr, selector.attr[attr])




    if (typeof props === 'string' || props instanceof Promise) {
        if (selector.element === 'img')
            promisify(props, val => element.src = val)
        else
            props = { text: props }
    }
    else if (props instanceof Array)
        props = { child: props }
    else if (props instanceof HTMLElement)
        props = { append: props }
    else if (!props) {
        console.warn('PROP is ', props)
        return element
    }

    if (props.className) {
        let classes = props.className

        if (!(props.className instanceof Array))
            classes = [props.className]

        element.classList.add(...classes)
    }

    if (props.text && !props.html)
        promisify(props.text, val => element.innerText = val)

    else if (props.html)
        promisify(props.html, val => element.innerHTML = val)

    if (props.child) {
        if (props.child instanceof Array) {
            props.child
                .filter(child => child)
                .forEach(child => {
                    if (child instanceof Promise) {
                        const comment = new Comment('CREATE-ELEMENT')
                        element.appendChild(comment)
                        child.then(value => {
                            element.insertBefore(value, comment)
                            comment.remove()
                        })
                    }
                    else if (['string', 'number'].includes(typeof child)) {
                        element.appendChild(new Text(child))
                    }
                    else {
                        element.appendChild(child)
                    }
                })
        }
        else {
            element.appendChild(props.child)
        }
    }

    if (props.data) {
        for (const data in props.data) {
            const value = props.data[data]
            promisify(value, val => element.dataset[data] = val)
        }
    }

    if (props.style) {
        for (const style in props.style) {
            let value = props.style[style]
            if (typeof value === 'object' && 'value' in value)
                value = value.value + (value.unit || '')
            promisify(value, val => element.style[style] = val)
        }
    }

    if (props.attr) {
        for (const attr in props.attr) {
            const value = props.attr[attr]
            promisify(value, val => element.setAttribute(attr, val))
        }
    }

    if (props.prop) {
        for (const prop in props.prop) {
            const value = props.prop[prop]
            promisify(value, val => element[prop] = val)
        }
    }

    if (props.src)
        promisify(props.src, src => element.src = src)

    if (props.on) {
        for (const prop in props.on) {
            const listener = props.on[prop]
            prop.split(', ').forEach(event => element.addEventListener(event, e => listener.call(element, e, element)))

        }
    }

    if (typeof props.ontrigger === 'function') {
        element.addEventListener('click', e => props.ontrigger.call(element, e, element))
        element.addEventListener('keydown', e => {
            if (e.code === 'Enter') {
                props.ontrigger.call(element, e, element)
                element.blur()
            }
        })
    }

    if (props.append) {
        props.append.appendChild(element)
    }
    else if (props.prepend) {
        props.prepend.insertBefore(element, props.prepend.firstChild || null)
    }

    if (typeof props.ref === 'function')
        props.ref.call(props, element)

    return element
}


function parseElement(elementObject) {
    const elem = Object.assign({}, elementObject)
    if (elem.props instanceof Array)
        elem.props = elem.props.map(e => parseElement(e))
    else if (typeof elem.props === 'object') {
        if (elem.props.child instanceof Array)
            elem.props.child = elem.props.child.map(e => parseElement(e))
        else if (typeof elem.props.child === 'object')
            elem.props.child = parseElement(elem.props.child)
    }

    return createElement(elem.name, elem.props)
}



function createIcon(type, ...rest) {
    const icon = createElement('i.material-icons', ...rest)

    if (icon)
        icon.innerText = type

    return icon
}

function changeIcon(icon, new_icon, ...classes) {
    icon.classList.add(...classes)
    icon.innerText = new_icon
}


function toDurationString(timeInSeconds) {
    const pad = (num, cut = true) => {
        const res = ('000' + num).slice(2 * -1)
        if (res[0] === '0' && cut)
            return res.replace('0', '')
        return res
    }

    const time = parseFloat(timeInSeconds).toFixed(3)
    const hours = Math.floor(time / 60 / 60)
    const minutes = Math.floor(time / 60) % 60
    const seconds = Math.floor(time - minutes * 60)

    const hr = pad(hours)
    const min = pad(minutes, hr === '0' ? true : false)
    const sec = pad(seconds, false)

    return (hr === '0' ? '' : hr + ':') + min + ':' + sec
}

function toTimeString(time) {
    const sec = Math.round(time % 60)
    const min = Math.round(((time - sec) / 60) % 60)
    const hour = Math.round((((time - sec) / 60) - min) / 60)

    const value = `${hour ? hour + 'hr. ' : ''}${min ? min + 'min.' : ''}`
    if (value)
        return value
    return `${sec}sec.`
}

function getFilterText(...value) {
    const text = value.filter(value => value).join('')
    return String(text).toLowerCase().replace(/ /g, '')
}

function toPlural(num, text = '') {
    if (num <= 0)
        return ''
    return `${num > 1 ? num + ' ' + text + 's' : num + ' ' + text}`
}

function getArraySurrounding(arr, target, surrounding) {
    const current = arr.indexOf(target)
    const max = current + (surrounding + 1)
    const min = current - (surrounding + 1)
    return arr.filter((_, pos) => (pos >= current && pos < max) || (pos <= current && pos > min))
}


function isOverflow(target) {
    const width = target.offsetWidth
    const parentWidth = target.parentElement.offsetWidth
    return width > parentWidth
}

module.exports = {
    Ev, Err, Icon,
    createChunk,
    createElement,
    createIcon,
    changeIcon,
    toDurationString,
    toTimeString,
    Outlet,
    Key,
    Render,
    Sort,
    getFilterText,
    parseElement,
    toPlural,
    getArraySurrounding,
    isOverflow
}