
const Render = {
    CUSTOM: 'custom',
    SONGS: 'songs',
    FAV: 'fav',
    ALBUMS: 'albums',
    ARTISTS: 'artists',
    RECENTS: 'recents',
    MOST_PLAYED: 'most played',
    SEARCH: 'search',
    WELCOME: 'welcome'
}

const Component = {
    PLAYLIST: 'playlist',
    SEARCH: 'search',
    COLLECTION: 'collection',
    WELCOME: 'welcome'
}

const Event = {
    ADD_PLAYLIST: 'add_playlist',
    REMOVE_PLAYLIST: 'remove_playlist',
    RENAME_PLAYLIST: 'rename_playlist',
    ADD_SONG: 'add_song',
    REMOVE_SONG: 'remove_song',
    UPDATE_SONG: 'update_song',
    ADD_METADATA: 'add_metadata',
    ADD_SONG_TO_PLAYLIST: 'add_song_to_playlist',
    REMOVE_SONG_FROM_PLAYLIST: 'remove_song_from_playlist',
    ADD_FAV: 'add_fav',
    REMOVE_FAV: 'remove_fav',
    SORT: 'sort',
    FILTER: 'filter',
    ROW_CLICK: 'row_clicked',
    CHANGE: 'change',
    RECENT_CHANGE: 'recent_change'
}

const Err = {
    PLAYLIST_NOT_FOUND: 'Playlist not found',
    SONG_NOT_FOUND: 'Song not found',
    FILE_NOT_FOUND: 'File not found',
    SONG_ALREADY_EXIST: 'Song already exist',
    PLAYLIST_DOES_NOT_INCLUDE_SONG: 'Playlist does not include song',
    METADATA: 'Can\'t apply metadata',
    UNSUPPORTED_FILE: 'File is not supported',
    INVALID_NAME: 'Invalid name',
    SONG_IS_ALREADY_FAV: 'Song is already favorite',
    SONG_IS_NOT_FAV: 'Song is not favorite'
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
    REPEAT: 'repeat',
    REPEAT_ONE: 'repeat_one',
    SHUFFLE: 'shuffle',
    ARROW_RIGHT: 'keyboard_arrow_right',
    VOLUME_UP: 'volume_up',
    VOLUME_DOWN: 'volume_down',
    VOLUME_MUTE: 'volume_mute',
    VOLUME_OFF: 'volume_off',
    NONE: ''
}

const Repeat = {
    NOREPEAT: 0,
    REPEAT: 1,
    REPEAT_ONE: 2
}

const Sort = {
    UP: 'up',
    DOWN: 'down',
    DEFAULT: null
}


function getImmutable(first, second = {}) {
    if (second === true)
        return JSON.parse(JSON.stringify(first))
    return Object.assign(Object.assign({}, first), second)
}


function toDurationString(time) {
    if (time <= 0)
        return '0:00'

    let sec = Math.round(time % 60)
    const min = Math.round(((time - sec) / 60) % 60)

    if (sec < 10)
        sec = '0' + sec

    return `${min}:${sec}`
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

function include(data, ...items) {
    return items.includes(data)
}

function isEmpty(obj) {
    if (obj)
        return !Boolean(Object.values(obj).length)
    return true

}


module.exports = {
    getImmutable,
    toDurationString,
    toTimeString,
    Event,
    Repeat,
    Err,
    Render,
    Sort,
    Icon,
    Component,
    include,
    isEmpty
}