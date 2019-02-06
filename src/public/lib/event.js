class EventListener {
    constructor({ logError = false }) {
        this._logError = logError
        this._eventListeners = {}
        this._errorEventListeners = {}
    }

    on(event, listener, tag) {
        if (tag)
            listener.tag = tag

        if(event instanceof Array) {
            event.forEach(e => this.on(e, listener, tag))
        }
        else {
            if (event in this._eventListeners)
                this._eventListeners[event].push(listener)
            else
                this._eventListeners[event] = [listener]
        }
   }

   onError(event, listener, tag) {
       if (tag)
           listener.tag = tag

       if (event instanceof Array) {
           event.forEach(e => this.on(e, listener, tag))
       }
       else {
           if (event in this._errorEventListeners)
               this._errorEventListeners[event].push(listener)
           else
               this._errorEventListeners[event] = [listener]
       }
   }

    removeEventListener(event, listener) {
        if (!listener) {
            this._eventListeners[event] = []
            this._errorEventListeners[event] = []
        }
        else if (typeof listener === 'function' && event in this._eventListeners) {
            this._eventListeners[event] = this._eventListeners[event].filter(fn => fn !== listener)
            this._errorEventListeners[event] = this._errorEventListeners[event].filter(fn => fn !== listener)
        }
        else if (typeof listener === 'string' && event in this._eventListeners) {
            this._eventListeners[event] = this._eventListeners[event].filter(fn => fn.tag !== listener)
            this._errorEventListeners[event] = this._errorEventListeners[event].filter(fn => fn.tag !== listener)
        }
    }

    removeAllEventListeners(tag) {
        if (tag) {
            for (const event in this._eventListeners)
                this._eventListeners[event] = this._eventListeners[event].filter(fn => fn.tag !== tag)
        
            for (const event in this._errorEventListeners)
                this._errorEventListeners[event] = this._errorEventListeners[event].filter(fn => fn.tag !== tag)
            }
        else {
            this._eventListeners = {}
            this._errorEventListeners = {}
        }
    }

    dispatchEvent(event, ...data) {
        if (event in this._eventListeners) {
            this._eventListeners[event]
                .forEach(listener => listener(...data))
        }
    }

    dispatchError(event, code, ...data) {
        if (this._logError) {
            console.groupCollapsed(`%c DISPATCH ERR: ${event} - ${code}`, 'color: red;')
            console.table({ event, code, ...data })
            console.error(code)
            console.groupEnd()
        }

        if (event in this._errorEventListeners) {
            this._errorEventListeners[event]
                .forEach(listener => listener(code, ...data))
        }
    }
}

module.exports = EventListener