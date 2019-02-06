class History {
    constructor(states = []) {
        this._states = states
        this._current = Math.max(0, states.length - 1)
        this._onChange = []
        this._beforeChange = []

    }

    get isFirst() {
        return this._current === 0
    }

    push(...val) {
        this._beforeChange.forEach(cb => cb.call(this, this._states[this._current]))
        this._states = this._states.filter((_, key) => key <= this._current)
        this._current = this._states.push(val) - 1
    }

    back() {
        const prev = this._current
        this._current = Math.max(0, this._current - 1)
        if (prev !== 0)
            this._onChange.forEach(cb => cb.call(this, this._states[this._current]))
    }

    onChange(cb) {
        this._onChange.push(cb)
    }

    beforeChange(cb) {
        this._beforeChange.push(cb)
    }
}


module.exports = History