const { createElement, createIcon } = require('../lib/query')
const { Icon, getImmutable } = require('../lib/common')
const SwitchComponent = require('./switch')

const default_option = {
    title: null,
    content: [],
    confirm: 'Confirm',
    cancel: 'Cancel'
}

class ModalComponent extends HTMLElement {
    constructor(option = default_option) {
        super()

        // Properties
        this.option = getImmutable(default_option, option)
        this.controller = {}

        // Event
        this._openEvent = new CustomEvent('open', { detail: {} })
        this._closeEvent = new CustomEvent('close', { detail: {} })
        this._confirmEvent = new CustomEvent('confirm', { detail: {} })

        // create DOM
        const close = createIcon(Icon.CLOSE + '.extra-small.close')
        close.addEventListener('click', _ => {
            this.close()
        })

        const heading = createElement('div.title', {
            text: this.option.title
        })
        const wrapper = createElement('div.wrapper')

        // Content
        this._content = createElement('div.content')
        this._renderContent()


        // Connect all the components
        const modalBox = createElement('div.modal-box')
        wrapper.appendChild(this._content)
        modalBox.appendChild(close)
        modalBox.appendChild(heading)
        modalBox.appendChild(wrapper)
        this.appendChild(modalBox)

        // close modal
        this.addEventListener('click', event => {
            if (event.target.isSameNode(this))
                this.close()
        })
    }

    static get Role() {
        return {
            INPUT: 'input',
            BUTTON: 'button',
            SWITCH: 'switch',
            CUSTOM: 'custom'
        }
    }

    close() {
        this._closeEvent.details = {
            component: this.controller
        }
        this.dispatchEvent(this._closeEvent)

        this.querySelectorAll('input').forEach(input => {
            input.value = ''
        })
        this.remove()
    }

    open() {
        this.dispatchEvent(this._openEvent)
        this.dataset.open = true
    }

    confirm() {

        const validState = {}
        const values = {}

        for (const controller in this.controller) {
            const input = this.controller[controller]

            if (input instanceof SwitchComponent) {
                values[controller] = this.controller[controller].state
            }
            else {
                values[controller] = this.controller[controller].value
                if (!input.validity.valid) {
                    validState[controller] = false
                    input.previousElementSibling.innerText = input.validationMessage
                    input.focus()
                    input.addEventListener('input', _ => {
                        input.previousElementSibling.innerText = input.validationMessage
                    })
                }
            }
        }

        const isValid = Object.values(validState).length === 0
        if (isValid) {
            for (const value in values)
                this._confirmEvent.detail[value] = values[value]

            this.close()
            this.dispatchEvent(this._confirmEvent)
        }
    }


    _renderContent() {

        if (this.option.content) {
            this.option.content.forEach(item => {
                switch (item.role) {
                    // INPUT
                    case ModalComponent.Role.INPUT:
                        const formGroup = createElement('div.form-group')
                        const id = `${Date.now()}-${item.name}`

                        if (item.label) {
                            const label = createElement('label', {
                                attr: {
                                    for: id
                                },
                                text: item.label
                            })
                            formGroup.appendChild(label)
                        }

                        const validationElement = createElement('div.validation')
                        formGroup.appendChild(validationElement)

                        const input = createElement('input', {
                            prop: Object.assign(item.prop || {}, {
                                type: item.type || 'text',
                                name: item.name || ''
                            }),
                            attr: {
                                id
                            }
                        })

                        if (item.action) {
                            input.addEventListener('input', _ => {
                                item.action.call(input, this)
                            })
                        }

                        this.controller[item.name] = input
                        formGroup.appendChild(input)
                        this._content.appendChild(formGroup)
                        break





                    // BUTTON
                    case ModalComponent.Role.BUTTON:
                        const buttonGroup = createElement('div.button-group')
                        const button = createElement('button', {
                            text: item.text
                        })

                        if (item.action) {
                            button.addEventListener('click', _ => {
                                item.action.call(button, this)
                            })
                        }

                        buttonGroup.appendChild(button)
                        this._content.appendChild(buttonGroup)
                        break



                    // SWITCH
                    case ModalComponent.Role.SWITCH:
                        const switchElement = new SwitchComponent({
                            label: item.label || null,
                            state: item.state
                        })
                        if (item.action) {
                            switchElement.addEventListener('switch', _ => {
                                item.action.call(switchElement, this)
                            })
                        }

                        this.controller[item.name] = switchElement
                        this._content.appendChild(switchElement)
                        break


                    case ModalComponent.Role.CUSTOM:
                        this._content.appendChild(item.render)
                        break
                }
            })
        }




        // Confirm and Cancel Buttons
        if (this.option.confirm || this.option.cancel) {
            const buttonGroup = createElement('.button-group')

            if (this.option.confirm) {
                const confirmButton = createElement('button', {
                    text: this.option.confirm
                })
                confirmButton.addEventListener('click', _ => {
                    this.confirm()
                })
                buttonGroup.appendChild(confirmButton)
            }

            if (this.option.cancel) {
                const cancelButton = createElement('button', {
                    text: this.option.cancel
                })
                cancelButton.addEventListener('click', _ => {
                    this.close()
                })
                buttonGroup.appendChild(cancelButton)
            }

            this._content.appendChild(buttonGroup)
        }
    }
}

customElements.define('modal-component', ModalComponent)
module.exports = ModalComponent




// option = {
//     title: 'Hello world',
//     confirm: 'Confirm',
//     cancel: 'Cancel',
//     content: [
//         {
//             role: 'input',
//             name: 'name',
//             type: 'text',
//             label: 'Name:',
//             action() {
//                 this.value
//             },
//             prop: {
//                 required: true
//             }
//         },
//         {
//             role: 'switch',
//             name: 'theme',
//             state: true,
//             label: 'Use Light Theme',
//             action() {
//                 this.state
//             }
//         },
//         {
//             role: 'button',
//             text: 'Press me',
//             action() {

//             }
//         },
//         {
//             role: 'custom',
//             render: createElement('h1', { text: 'Hello' })
//         }
//     ]
// }

// const modal = new ModalComponent(option)

// modal.open()
// document.body.appendChild(modal)

