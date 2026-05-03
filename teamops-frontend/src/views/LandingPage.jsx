import { Link, Navigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  CheckCircle2,
  ChevronRight,
  Database,
  Gauge,
  Globe,
  Layers3,
  Lock,
  MessageCircle,
  Moon,
  PlayCircle,
  Rocket,
  Rows4,
  ShieldCheck,
  Sparkles,
  Sun,
  Workflow,
} from 'lucide-react'
import { useTheme } from '../state/ThemeContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'

const heroFeatures = [
  {
    icon: Workflow,
    title: 'Live workflow sync',
    description: 'Card moves and updates propagate instantly to every teammate via board channels.',
  },
  {
    icon: BellRing,
    title: 'Smart notifications',
    description: 'Priority updates, mentions, and activity alerts keep everyone focused and aligned.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure collaboration',
    description: 'Role-aware access keeps workspaces private and organized.',
  },
  {
    icon: Database,
    title: 'Reliable data layer',
    description: 'Structured backend with persistent ordering, logs, and history.',
  },
]

const flowCards = [
  {
    icon: Lock,
    title: 'Sign up and create workspace',
    description: 'Onboard in seconds and invite your teammates with secure access.',
  },
  {
    icon: Rows4,
    title: 'Build your Kanban board',
    description: 'Create columns, assign owners, and define a clear sprint workflow.',
  },
  {
    icon: Workflow,
    title: 'Sync in real-time',
    description: 'Every card event broadcasts instantly to everyone on the board.',
  },
  {
    icon: Gauge,
    title: 'Track progress live',
    description: 'Use activity feeds and metrics to keep execution sharp and visible.',
  },
]

const testimonials = [
  {
    name: 'Zainab Saeed',
    role: 'Owner · NUST SEECS',
    quote: 'The sync feels magical. You move a card and the whole team sees it instantly.',
  },
  {
    name: 'Zunairah Sarwar',
    role: 'Admin · Alpha Team',
    quote: 'The UI feels alive and clear. We ship faster because everything is visible.',
  },
  {
    name: 'Ahmed K.',
    role: 'Member · Dev Team',
    quote: 'Real-time activity and polished motion made collaboration much easier to manage.',
  },
]

const brands = ['NUST', 'SEECS', 'Alpha Corp', 'Devhive', 'Stackify']

export default function LandingPage() {
  const { token } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const rootRef = useRef(null)
  const ringRef = useRef(null)
  const dotRef = useRef(null)
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const ring = ringRef.current
    const dot = dotRef.current

    if (!ring || !dot) {
      return undefined
    }

    let mx = window.innerWidth / 2
    let my = window.innerHeight / 2
    let rx = mx
    let ry = my

    const onMove = (event) => {
      mx = event.clientX
      my = event.clientY
      dot.style.left = `${mx}px`
      dot.style.top = `${my}px`
    }

    const onHover = (event) => {
      if (event.target.closest('button, a, .hero-card, .how-card, .feat-cell, .proof-card, .schema-row')) {
        document.body.classList.add('cur-hover')
      }
    }

    const onOut = (event) => {
      if (event.target.closest('button, a, .hero-card, .how-card, .feat-cell, .proof-card, .schema-row')) {
        document.body.classList.remove('cur-hover')
      }
    }

    const onDown = () => document.body.classList.add('cur-click')
    const onUp = () => document.body.classList.remove('cur-click')

    const animate = () => {
      rx += (mx - rx) * 0.14
      ry += (my - ry) * 0.14
      ring.style.left = `${rx}px`
      ring.style.top = `${ry}px`
      window.requestAnimationFrame(animate)
    }

    window.requestAnimationFrame(animate)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseover', onHover)
    window.addEventListener('mouseout', onOut)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseover', onHover)
      window.removeEventListener('mouseout', onOut)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      document.body.classList.remove('cur-hover', 'cur-click')
    }
  }, [])

  useEffect(() => {
    const nodes = rootRef.current?.querySelectorAll('.reveal')
    if (!nodes?.length) {
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, index) => {
          if (entry.isIntersecting) {
            window.setTimeout(() => entry.target.classList.add('in'), index * 80)
          }
        })
      },
      { threshold: 0.08 },
    )

    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const buttons = rootRef.current?.querySelectorAll('.magnetic')
    if (!buttons?.length) {
      return undefined
    }

    const cleanups = []

    buttons.forEach((button) => {
      const onMove = (event) => {
        const rect = button.getBoundingClientRect()
        const x = (event.clientX - rect.left - rect.width / 2) * 0.22
        const y = (event.clientY - rect.top - rect.height / 2) * 0.22
        button.style.transform = `translate(${x}px, ${y}px)`
      }

      const onLeave = () => {
        button.style.transform = ''
      }

      button.addEventListener('mousemove', onMove)
      button.addEventListener('mouseleave', onLeave)

      cleanups.push(() => {
        button.removeEventListener('mousemove', onMove)
        button.removeEventListener('mouseleave', onLeave)
      })
    })

    return () => {
      cleanups.forEach((dispose) => dispose())
    }
  }, [])

  const showToast = (title, message) => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((current) => [...current, { id, title, message }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id))
    }, 3200)
  }

  if (token) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="landing-wrap" ref={rootRef}>
      <div id="cur-ring" ref={ringRef} />
      <div id="cur-dot" ref={dotRef} />

      <div className="toast-wrap">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast show">
            <Sparkles size={16} className="toast-icon" />
            <div>
              <div className="toast-title">{toast.title}</div>
              <div className="toast-msg">{toast.message}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="aurora-bg" aria-hidden />

      <header className="landing-nav">
        <div className="landing-brand">
          <span className="brand-dot" />
          TeamOps
        </div>

        <nav className="landing-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#stories">Stories</a>
          <a href="#cta">Get Started</a>
        </nav>

        <div className="landing-actions">
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle color mode">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Link className="btn-ghost magnetic" to="/login">
            Log in
          </Link>
          <Link className="btn magnetic" to="/register">
            Get started
          </Link>
        </div>
      </header>

      <main className="landing-main">
        <section className="hero-panel" id="features">
          <span className="hero-chip">
            <Sparkles size={14} />
            Real-time sync · Board rooms · Zero refresh
          </span>
          <h1>Your team, finally in sync.</h1>
          <p>
            TeamOps is a cinematic collaborative operating system for projects. Move cards, assign owners,
            and ship with confidence as every update appears instantly across your team.
          </p>

          <div className="hero-actions">
            <Link className="hero-btn-primary magnetic" to="/register">
              Start free
              <ArrowRight size={16} />
            </Link>
            <Link className="hero-btn-secondary magnetic" to="/login">
              <PlayCircle size={16} />
              Live demo
            </Link>
          </div>

          <div className="hero-cards reveal">
            {heroFeatures.map((feature) => {
              const Icon = feature.icon
              return (
                <article className="hero-card" key={feature.title}>
                  <div className="hero-card-icon">
                    <Icon size={18} />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </article>
              )
            })}
          </div>
        </section>

        <section className="stats-panel">
          <h2>Designed for velocity</h2>
          <div className="stats-grid">
            <article>
              <span>Board latency</span>
              <strong>&lt; 50ms</strong>
            </article>
            <article>
              <span>Realtime events</span>
              <strong>100%</strong>
            </article>
            <article>
              <span>Workflow clarity</span>
              <strong>24/7</strong>
            </article>
          </div>

          <div className="landing-mini-board">
            <header>
              <Layers3 size={16} />
              Sprint Pulse
            </header>
            <ul>
              <li>
                <CheckCircle2 size={14} />
                API integration ready for review
              </li>
              <li>
                <CheckCircle2 size={14} />
                Team board synced in realtime
              </li>
              <li>
                <CheckCircle2 size={14} />
                Notifications delivered instantly
              </li>
            </ul>
          </div>
        </section>
      </main>

      <section className="brands reveal">
        <div className="brands-label">Trusted by teams at</div>
        <div className="brands-row">
          {brands.map((brand) => (
            <div key={brand} className="brand-name">{brand}</div>
          ))}
        </div>
      </section>

      <section className="section-wrap" id="how-it-works">
        <div className="section-pill">Workflow</div>
        <h2 className="section-h2">How TeamOps makes execution effortless</h2>
        <div className="how-grid reveal">
          {flowCards.map((item) => {
            const Icon = item.icon
            return (
              <article className="how-card" key={item.title}>
                <span className="how-step"><Icon size={20} /></span>
                <div className="how-title">{item.title}</div>
                <div className="how-desc">{item.description}</div>
                <button className="ms-btn magnetic" onClick={() => showToast('Workflow event', `${item.title} completed.`)}>
                  Simulate action
                  <ChevronRight size={14} />
                </button>
              </article>
            )
          })}
        </div>
      </section>

      <section className="features-section">
        <div className="section-pill">Core features</div>
        <h2 className="section-h2">Built for teams who ship fast</h2>
        <div className="features-grid reveal">
          <article className="feat-cell"><span className="feat-icon"><Workflow size={20} /></span><div className="feat-title">Real-time board updates</div><div className="feat-desc">Socket-driven event delivery keeps each action synchronized.</div></article>
          <article className="feat-cell"><span className="feat-icon"><Rows4 size={20} /></span><div className="feat-title">Flexible Kanban workflow</div><div className="feat-desc">Drag-and-drop progression with priority, due date, and ownership context.</div></article>
          <article className="feat-cell"><span className="feat-icon"><BellRing size={20} /></span><div className="feat-title">Contextual notifications</div><div className="feat-desc">Unread badges and event feed reduce misses and improve response speed.</div></article>
          <article className="feat-cell"><span className="feat-icon"><Database size={20} /></span><div className="feat-title">Reliable persistence</div><div className="feat-desc">Relational storage supports durable order, comments, and history.</div></article>
          <article className="feat-cell"><span className="feat-icon"><MessageCircle size={20} /></span><div className="feat-title">Activity storytelling</div><div className="feat-desc">Every move, assignment, and update appears in one transparent stream.</div></article>
          <article className="feat-cell"><span className="feat-icon"><Globe size={20} /></span><div className="feat-title">Responsive experience</div><div className="feat-desc">Professional motion language across desktop and mobile layouts.</div></article>
        </div>
      </section>

      <section className="social-section" id="stories">
        <div className="section-pill">What teams say</div>
        <h2 className="section-h2">Loved by people who build together</h2>
        <div className="social-cols reveal">
          {testimonials.map((item) => (
            <article className="proof-card" key={item.name}>
              <p className="proof-quote">"{item.quote}"</p>
              <div className="proof-author">
                <div className="proof-av">{item.name.charAt(0)}</div>
                <div>
                  <div className="proof-name">{item.name}</div>
                  <div className="proof-role">{item.role}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="tech-section">
        <div className="tech-inner">
          <div className="tech-left">
            <div className="section-pill">Tech stack</div>
            <h2 className="section-h2">Modern architecture, proven reliability</h2>
            <p className="hero-subtext">React frontend, Node and Express APIs, Socket channels, and relational persistence.</p>
            <div className="tech-pills">
              <div className="tech-pill">React</div>
              <div className="tech-pill">Node.js</div>
              <div className="tech-pill">Express</div>
              <div className="tech-pill">Socket.io</div>
              <div className="tech-pill">PostgreSQL</div>
              <div className="tech-pill">dnd-kit</div>
            </div>
          </div>

          <div className="tech-right reveal">
            <div className="db-schema-visual">
              <div className="schema-header">
                <div className="schema-dot red" />
                <div className="schema-dot amber" />
                <div className="schema-dot green" />
                <div className="schema-title">database.schema</div>
              </div>
              <div className="schema-body">
                <div className="schema-row"><div className="schema-table">Users</div><div className="schema-fields">id, email, password_hash</div></div>
                <div className="schema-row"><div className="schema-table">Workspaces</div><div className="schema-fields">id, owner_id, title</div><span className="schema-fk">FK</span></div>
                <div className="schema-row"><div className="schema-table">Boards</div><div className="schema-fields">id, workspace_id, title</div><span className="schema-fk">FK</span></div>
                <div className="schema-row"><div className="schema-table">Cards</div><div className="schema-fields">id, board_id, status</div><span className="schema-fk">FK</span></div>
                <div className="schema-row"><div className="schema-table">Notifications</div><div className="schema-fields">id, user_id, is_read</div><span className="schema-fk">FK</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-cta" id="cta">
        <h2>Ready to run your project at full speed?</h2>
        <Link className="btn magnetic" to="/register">
          <Rocket size={16} />
          Create workspace
        </Link>
      </section>

      <footer className="landing-footer">
        <div>
          <div className="footer-logo">TeamOps</div>
          <div className="footer-sub">Real-time collaborative project management platform</div>
        </div>
        <button className="footer-link magnetic" onClick={() => showToast('Visit', 'Portfolio preview opened')}>
          <ArrowUpRight size={16} />
          Visit site
        </button>
      </footer>
    </div>
  )
}
