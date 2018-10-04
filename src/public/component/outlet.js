const { getImmutable } = require('../lib/common')
const default_option = {
    state: {},
    component: {},
    dependencies: [],
    render: null
}
class OutletComponent extends HTMLElement {
    constructor(option = default_option) {
        super()
        /* Properties */
        option = getImmutable(default_option, option)
        this.state = new Proxy(option.state, this.handler)
        this.target = option.state
        this.component = option.component
        this.dependencies = option.dependencies
        this.channel = option.render
        this._stateList = []
        this._callback = {}
        this.content = null
        this._renderEvent = new CustomEvent('render', { detail: {} })

        /* Get component classes */
        for (const component in this.component) {
            const view = new this.component[component](this, ...this.dependencies)
            this._callback[component] = view
        }

        /* Render default content */
        if (this.channel) {
            this.render(this.channel)
        }
    }

    get handler() {
        return {
            get: (target, prop) => {
                if (prop === '_target')
                    return target

                if (this.channel in this._stateList) {
                    if (!this._stateList[this.channel].includes(prop))
                        this._stateList[this.channel].push(prop)
                }
                else {
                    this._stateList[this.channel] = [prop]
                }


                return target[prop]
            },

            set: (target, property, value) => {
                this.target[property] = value
                target[property] = value
                return true
            }
        }
    }

    overideState(new_state) {
        this._overideState(new_state)
        this._renderOnStateChange(new_state)
    }

    setState(state) {
        this._setState(state)
        this._renderOnStateChange(state)
    }

    render(channel, state) {
        const prevView = this._callback[this.channel]

        if (prevView && 'renderWillUnmount' in prevView) {
            prevView.renderWillUnmount.call(prevView, this)
        }

        this.channel = channel
        if (state)
            this._overideState(state)

        const view = this._callback[this.channel]
        if ('renderWillMount' in view)
            view.renderWillMount.call(view, this.state)

        const content = view.render.call(view, this.state)
        this.innerHTML = ''
        this.appendChild(content)
        this.content = content

        if ('renderDidMount' in view)
            view.renderDidMount.call(view, this.state, content)

        this._renderEvent.detail.outlet = this
        this.dispatchEvent(this._renderEvent)
    }

    reload() {
        this.render(this.channel, this.target)
    }


    _overideState(new_state) {
        this.state = new Proxy(new_state, this.handler)
        this.target = new_state
    }

    _setState(state) {
        if (typeof state === 'function') {
            const new_state = state.call(this, this.target)
            Object.assign(this.state, new_state)
        }
        else {
            Object.assign(this.state, state)
        }
    }

    _renderOnStateChange(state) {
        if (this.channel in this._stateList) {
            for (const prop of this._stateList[this.channel]) {
                if (Object.keys(state).includes(prop)) {
                    this.render(this.channel)
                    break
                }
            }
        }
    }
}

customElements.define('outlet-component', OutletComponent)
module.exports = OutletComponent

