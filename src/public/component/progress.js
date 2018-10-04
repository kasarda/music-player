const { createElement, createIcon, changeIcon } = require('../lib/query')
const { getProgress } = require('kasarda/node/common')
const { getImmutable } = require('../lib/common')


const default_option = {
    state: 0,
    controller: true,
    metadata: {
        left: false,
        right: false
    },
    icon: null,
    onIconClicked: null
}


class ProgressComponent extends HTMLElement {
    constructor(option = default_option) {
        super()
        /* Properties */
        this.option = getImmutable(default_option, option)
        if (this.option.state > 1)
            this.option.state = 1
        else if (this.option.state < 0)
            this.option.state = 0

        this._changeEvent = new CustomEvent('change', { detail: {} })
        this._dragEvent = new CustomEvent('drag', { detail: {} })
        this._dragendEvent = new CustomEvent('dragend', { detail: {} })
        this.data = {}
        this.draged = false
        this.metadata = {
            left: this.option.metadata.left ? this.option.metadata.left : '',
            right: this.option.metadata.right ? this.option.metadata.right : ''
        }
        this.disabled = false

        /* DOM */
        const wrapper = createElement('.wrapper')
        const progressElement = createElement('.progress')
        this._bar = createElement('.bar')
        const thumb = createElement('.thumb')
        this._bar.appendChild(thumb)
        progressElement.appendChild(this._bar)
        wrapper.appendChild(progressElement)
        this.appendChild(wrapper)

        /* Set Init State */
        this.state = this.option.state
        this._updateBar(this.state)

        /* Metadata */
        if (this.option.metadata) {
            if (this.option.metadata.left)
                this.leftMetadata = this._createMetadata('afterbegin', this.metadata.left)

            if (this.option.metadata.right)
                this.rightMetadata = this._createMetadata('beforeend', this.metadata.right)
        }

        /* Icon */
        if (this.option.icon) {
            const iconName = this.option.icon(this)
            this._icon = createIcon(`${iconName}.small`)
            this.insertAdjacentElement('afterbegin', this._icon)

            if (this.option.onIconClicked) {
                this._icon.addEventListener('click', _ => {
                    this.option.onIconClicked.call(this._icon, this)
                })
            }
        }

        // Controller
        if (this.option.controller) {
            const drag = event => {
                if(!this.disabled) {
                    thumb.classList.remove('disabled')
                    if (this.draged && event.type === 'mousemove') {
                        this._dragEvent.detail.state = this.state
                        this.dispatchEvent(this._dragEvent)
                    }

                    const left = parseFloat(window.getComputedStyle(wrapper).paddingLeft)
                    const right = parseFloat(window.getComputedStyle(wrapper).paddingRight)
                    const { clientX } = event
                    const { x, width } = wrapper.getBoundingClientRect()

                    const max = width - (left + right)
                    const value = clientX - (x + left)
                    const progress = getProgress(0, max, value)
                    this.setState(progress)

                    if (event.type === 'click') {
                        this.draged = false
                        this.clicked = true
                        this._dragendEvent.detail.state = this.state
                        this.dispatchEvent(this._dragendEvent)
                    }
                    this.draged = true
                }
                else {
                    thumb.classList.add('disabled')
                }

            }

            window.addEventListener('mouseup', _ => {
                window.removeEventListener('mousemove', drag)
                if(this.draged && !this.clicked) {
                    this._dragendEvent.detail.state = this.state
                    this.dispatchEvent(this._dragendEvent)
                    this.clicked = false
                }
            })

            wrapper.addEventListener('click', drag)

            wrapper.addEventListener('mousedown', _ => {
                this.clicked = false
                window.addEventListener('mousemove', drag)
            })
        }
        else {
            thumb.classList.add('disabled')
        }

    }


    setState(newState, dispatchEvent = true) {
        // Validate state
        let validState = newState

        if (newState > 1)
            validState = 1

        if (newState < 0)
            validState = 0

        // Render state visualy
        this._updateBar(validState)

        // Set state
        this.state = validState

        // Update icon
        if (this._icon)
            changeIcon(this._icon, this.option.icon(this))

        // Update Metadata
        if (this.leftMetadata)
            this.leftMetadata.innerText = this.metadata.left

        if (this.rightMetadata)
            this.rightMetadata.innerText = this.metadata.right

        // Emit change event
        if (dispatchEvent) {
            this._changeEvent.detail.state = validState
            this.dispatchEvent(this._changeEvent)
        }
    }

    left(value) {
        this.metadata.left = value
    }

    right(value) {
        this.metadata.right = value
    }

    disable(disable = true) {
        this.disabled = disable
    }

    _createMetadata(position, value) {
        const metadata = createElement('span.metadata', {
            text: value
        })
        this.insertAdjacentElement(position, metadata)
        return metadata
    }

    _updateBar(state) {
        this._bar.style.width = state * 100 + '%'
    }
}

customElements.define('progress-component', ProgressComponent)
module.exports = ProgressComponent
