import {
  Activity,
  Award,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  Star,
} from 'lucide-react'

const profile = {
  name: 'Zainab Saeed',
  joinedAt: '24 Nov 2022',
  city: 'Islamabad, Pakistan',
  birthDate: '08 Apr 1993',
  email: 'zainab@teamops.dev',
  phone: '+92 300 123 4567',
  avatar: 'https://ui-avatars.com/api/?name=Zainab+Saeed&background=7c5cfc&color=fff&size=220',
}

const courses = [
  {
    id: 1,
    title: 'UX/UI Design - Web Experiences',
    summary: 'Layout systems, typography and visual hierarchy.',
    lessons: 68,
    status: 'Completed',
    tone: 'completed',
    date: 'Apr 15',
  },
  {
    id: 2,
    title: 'UX/UI Design - Mobile Apps',
    summary: 'Mobile interaction patterns and design components.',
    lessons: 12,
    status: 'Completed',
    tone: 'completed',
    date: 'Apr 17',
  },
  {
    id: 3,
    title: 'UX/UI Design - Motion and Microinteractions',
    summary: 'Animation principles for expressive product feedback.',
    lessons: 12,
    status: 'In Progress',
    tone: 'progress',
    date: 'Started 13 Jun',
  },
]

const subscriptionFeatures = [
  '1 month premium free trial',
  '2 months student discount',
  'Cancel anytime with one click',
  'Monthly perks and workshops',
]

export default function ProfilePage() {
  return (
    <section className="profile-page">
      <div className="profile-grid">
        <article className="profile-main-card">
          <div className="profile-user">
            <img className="profile-avatar" src={profile.avatar} alt={profile.name} />
            <div className="profile-details">
              <h3>{profile.name}</h3>
              <ul>
                <li><CalendarDays size={14} /> Joined: {profile.joinedAt}</li>
                <li><MapPin size={14} /> {profile.city}</li>
                <li><Activity size={14} /> Birth date: {profile.birthDate}</li>
                <li><Mail size={14} /> {profile.email}</li>
                <li><Phone size={14} /> {profile.phone}</li>
              </ul>
              <div className="profile-socials">
                <span>IG</span>
                <span>FB</span>
                <span>X</span>
                <span>VK</span>
                <span>TG</span>
              </div>
            </div>
          </div>
        </article>

        <article className="payment-card">
          <h3>Payment Data</h3>
          <div className="payment-line">
            <CreditCard size={14} />
            <span>236 **** **** 265</span>
          </div>
          <div className="payment-brands">
            <span>Western Union</span>
            <span>G Pay</span>
            <span>Mastercard</span>
            <span>Visa</span>
          </div>
        </article>
      </div>

      <div className="profile-grid lower">
        <article className="courses-card">
          <h3>My Courses</h3>
          <div className="timeline-wrap">
            <div className="timeline-rail" />
            <div className="course-list">
              {courses.map((course, index) => (
                <article key={course.id} className={`course-item ${course.tone}`}>
                  <div className={`timeline-dot ${index === courses.length - 1 ? 'last' : ''}`} />
                  <div className="course-content">
                    <div className="course-head">
                      <h4>{course.title}</h4>
                      <span className={`course-status ${course.tone}`}>{course.status}</span>
                    </div>
                    <p>{course.summary}</p>
                    <div className="course-meta">
                      <span>{course.lessons} lessons</span>
                      <span>{course.date}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </article>

        <article className="subscription-card">
          <h3>Success Premium</h3>
          <ul>
            {subscriptionFeatures.map((item) => (
              <li key={item}>
                <CheckCircle2 size={14} />
                {item}
              </li>
            ))}
          </ul>
          <button className="btn subscribe-btn" type="button">
            <Star size={14} />
            Subscribe
          </button>
          <p className="muted trial-note"><Clock3 size={13} /> Starts immediately</p>
        </article>
      </div>
    </section>
  )
}
