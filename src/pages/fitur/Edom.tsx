import { useState } from 'react'
import { CheckCircle2, Star } from 'lucide-react'
import { schedule } from '../../data/demo'
import { Badge, DemoNote, PageHeader } from '../../components/ui'

// #42 EDOM & survei — form dinamis dari daftar pertanyaan (nantinya dari BFF).
const QUESTIONS = ['Dosen menjelaskan materi dengan jelas', 'Dosen hadir & tepat waktu', 'Materi sesuai RPS', 'Penilaian adil & transparan']

export function Edom({ back }: { back: () => void }) {
  const courses = schedule.slice(0, 4)
  const [active, setActive] = useState<string | null>(null)
  const [done, setDone] = useState<string[]>([])
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const course = courses.find((c) => c.code === active)

  if (course)
    return (
      <div>
        <PageHeader title="Evaluasi Dosen" subtitle={`${course.name} · ${course.lecturer}`} onBack={() => setActive(null)} />
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            setDone((d) => [...d, course.code])
            setActive(null)
            setAnswers({})
          }}
        >
          {QUESTIONS.map((q, i) => (
            <fieldset key={q} className="glass p-4">
              <legend className="sr-only">{q}</legend>
              <p className="text-sm font-semibold">{i + 1}. {q}</p>
              <div className="mt-3 flex gap-2" role="radiogroup" aria-label={q}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="flex-1">
                    <input type="radio" name={`q${i}`} value={n} required className="peer sr-only" checked={answers[i] === n} onChange={() => setAnswers((a) => ({ ...a, [i]: n }))} />
                    <span className="flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-xl bg-glass-strong text-xs font-semibold text-mid peer-checked:bg-[var(--primary)] peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-cyan">
                      <Star className="h-4 w-4" /> {n}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <textarea placeholder="Saran untuk dosen (opsional)" className="glass min-h-24 w-full p-4 outline-none" />
          <button className="btn-primary min-h-12 w-full rounded-2xl font-semibold">Kirim evaluasi</button>
        </form>
      </div>
    )

  return (
    <div>
      <PageHeader title="EDOM & Survei" subtitle="Isi sebelum melihat nilai semester" onBack={back} />
      <DemoNote />
      <div className="glass divide-y divide-line overflow-hidden">
        {courses.map((c) => {
          const ok = done.includes(c.code)
          return (
            <button key={c.code} disabled={ok} onClick={() => setActive(c.code)} className="flex min-h-16 w-full items-center gap-3 px-4 text-left hover:bg-glass-strong disabled:hover:bg-transparent">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-low">{c.lecturer}</div>
              </div>
              {ok ? <Badge tone="green"><CheckCircle2 className="h-3 w-3" /> Selesai</Badge> : <Badge tone="amber">Belum diisi</Badge>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
