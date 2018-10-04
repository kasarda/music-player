class EventListener {
    constructor() {
        this._eventListeners = {}
    }

    addEventListener(event, listener, tag) {
        if (tag)
            listener.tag = tag

        if (event in this._eventListeners)
            this._eventListeners[event].push(listener)
        else
            this._eventListeners[event] = [listener]
    }

    removeEventListener(event, listener) {
        if (!listener)
            this._eventListeners[event] = []
        else if (typeof listener === 'function' && event in this._eventListeners) {
            this._eventListeners[event] = this._eventListeners[event].filter(fn => fn !== listener)
        }
        else if (typeof listener === 'string' && event in this._eventListeners) {
            this._eventListeners[event] = this._eventListeners[event].filter(fn => fn.tag !== listener)
        }
    }

    removeAllEventListeners(tag) {
        if (tag) {
            for (const event in this._eventListeners)
                this._eventListeners[event] = this._eventListeners[event].filter(fn => fn.tag !== tag)
        }
        else {
            this._eventListeners = {}
        }
    }

    dispatchEvent(event, ...data) {
        if (event in this._eventListeners) {
            this._eventListeners[event]
                .forEach(listener => listener(null, ...data))
        }
    }

    dispatchError(event, code, ...data) {
        if (event in this._eventListeners) {
            this._eventListeners[event]
                .forEach(listener => listener({
                    code,
                    data
                }))
        }
    }
}

module.exports = EventListener