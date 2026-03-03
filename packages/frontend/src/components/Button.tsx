import PropTypes from 'prop-types'
import { MouseEventHandler } from 'react'

type Props = {
    onClick: MouseEventHandler,
    color: string,
    text: string,
  }

const Button = ({onClick,color,text}:Props) => {
    return <button onClick = {onClick} style={{backgroundColor: color}} type='button' className='btn'> {text} </button>
}

Button.defaultProps = {
    color:'steelblue',
}

Button.propTypes = {
    text: PropTypes.string,
    color: PropTypes.string,
    onclick: PropTypes.func
}

export default Button
