import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './admin/Icon'

export function ProfileMenu({ user, dashboardPath, active, onLogout }) {
    const [open, setOpen] = useState(false)
    const rootRef = useRef(null)
    const triggerRef = useRef(null)
    const startAtEnd = useRef(false)
    const menuId = useId()
    const initial = Array.from(user?.username?.trim() || 'U')[0].toUpperCase()

    useEffect(() => {
        if (!open) return
        const items = rootRef.current.querySelectorAll('[role="menuitem"]')
        items[startAtEnd.current ? items.length - 1 : 0]?.focus()
        function outside(event) {
            if (!rootRef.current?.contains(event.target)) setOpen(false)
        }
        document.addEventListener('pointerdown', outside)
        document.addEventListener('focusin', outside)
        return () => {
            document.removeEventListener('pointerdown', outside)
            document.removeEventListener('focusin', outside)
        }
    }, [open])

    function close() {
        setOpen(false)
        triggerRef.current?.focus()
    }

    function keyDown(event) {
        if (event.key === 'Escape' && open) {
            event.preventDefault()
            event.stopPropagation()
            close()
        } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault()
            if (!open) {
                startAtEnd.current = event.key === 'ArrowUp' || event.key === 'End'
                setOpen(true)
                return
            }
            const items = Array.from(rootRef.current.querySelectorAll('[role="menuitem"]'))
            const index = items.indexOf(document.activeElement)
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
                : index < 0 ? event.key === 'ArrowDown' ? 0 : items.length - 1
                    : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
            items[next]?.focus()
        }
    }

    return (
        <div ref={rootRef} className="profile-menu" onKeyDown={keyDown}>
            <button ref={triggerRef} type="button" id={`${menuId}-trigger`} className={`profile-trigger ${active ? 'active' : ''}`}
                aria-label="Profile" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
                onClick={() => { startAtEnd.current = false; setOpen((value) => !value) }}>
                <span className="profile-avatar" aria-hidden="true">{initial}</span><span>Profile</span><Icon name="chevron" size={14} />
            </button>
            {open && <div className="profile-popover">
                <div className="profile-identity"><span className="profile-avatar" aria-hidden="true">{initial}</span><div><strong>{user.username}</strong>{user.email && <span>{user.email}</span>}{user.role === 'ADMIN' && <small>Administrator</small>}</div></div>
                <div role="menu" id={menuId} aria-labelledby={`${menuId}-trigger`}>
                    <Link role="menuitem" to={dashboardPath} aria-current={active ? 'page' : undefined} onClick={close}><Icon name={user.role === 'ADMIN' ? 'shield' : 'user'} size={17} />View dashboard<Icon name="arrow" size={15} /></Link>
                    <div className="profile-menu-divider" role="separator" />
                    <button type="button" role="menuitem" className="profile-logout" onClick={() => { close(); onLogout() }}><Icon name="logout" size={17} />Log out</button>
                </div>
            </div>}
        </div>
    )
}
