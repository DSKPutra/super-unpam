import { useState } from 'react'
import { getClasses, getTasks } from '../lib/api'
import { useResource } from '../lib/useResource'
import type { OnlineClass, Task } from '../lib/types'
import { Async, Badge, DemoNote, PageHeader, Progress, Tabs } from '../components/ui'

type Tab = 'kelas' | 'tugas'

export function Kuliah({ tab, go }: { tab: string; go: (r: string) => void }) {
  const active: Tab = tab === 'tugas' ? 'tugas' : 'kelas'
  const classesRes = useResource(getClasses)
  const tasksRes = useResource(getTasks)
  const [openClass, setOpenClass] = useState<string | null>(null)
  const cls = classesRes.data?.find((c) => c.code === openClass)

  if (cls) {
    return (
      <div>
        <PageHeader title={cls.name} onBack={() => setOpenClass(null)} />
        <DemoNote />
        <div className="glass mb-4 p-4">
          <div className="mb-2 flex justify-between text-sm">
            <span>Progres belajar</span>
            <span className="font-semibold">{cls.progress}%</span>
          </div>
          <Progress value={cls.progress} color={cls.color} />
        </div>
        <div className="glass divide-y divide-line">
          {Array.from({ length: cls.materials }, (_, i) => i + 1).map((n) => {
            const done = n <= Math.round((cls.progress / 100) * cls.materials)
            return (
              <div key={n} className="flex items-center gap-3 p-4">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${done ? 'bg-[color-mix(in_srgb,var(--mint)_14%,transparent)] text-mint' : 'bg-glass-strong text-mid'}`}>
                  {done ? '✓' : n}
                </span>
                <div className="flex-1">
                  <div className="font-medium">Pertemuan {n}</div>
                  <div className="text-xs text-mid">Materi · Video · Forum diskusi</div>
                </div>
                {!done && n === Math.round((cls.progress / 100) * cls.materials) + 1 && <Badge tone="blue">Berikutnya</Badge>}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Kuliah Online" />
      <Tabs value={active} onChange={(v) => go(v === 'kelas' ? 'kuliah' : 'kuliah/tugas')} options={[['kelas', 'Kelas Saya'], ['tugas', 'Tugas & Kuis']]} />
      <DemoNote />
      {active === 'kelas' ? (
        <Async res={classesRes}>{(classes) => <ClassGrid classes={classes} onOpen={setOpenClass} />}</Async>
      ) : (
        <Async res={tasksRes}>{(tasks) => <TaskList initial={tasks} />}</Async>
      )}
    </div>
  )
}

function ClassGrid({ classes, onOpen }: { classes: OnlineClass[]; onOpen: (code: string) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {classes.map((c) => (
        <button key={c.code} onClick={() => onOpen(c.code)} className="glass glass-hover overflow-hidden text-left">
          <div className="h-16" style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}aa)` }} />
          <div className="p-4">
            <div className="text-xs text-mid">{c.code}</div>
            <div className="font-semibold">{c.name}</div>
            <div className="mt-3">
              <Progress value={c.progress} color={c.color} />
            </div>
            <div className="mt-1 text-xs text-mid">{c.progress}% selesai · {c.materials} pertemuan</div>
          </div>
        </button>
      ))}
    </div>
  )
}

// Daftar tugas menyimpan status lokal; TODO(BFF): kumpulkan tugas lewat POST ke MENTARI.
function TaskList({ initial }: { initial: Task[] }) {
  const [tasks, setTasks] = useState(initial)
  return (
    <div className="glass divide-y divide-line">
      {tasks.map((x) => (
        <div key={x.id} className="flex items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <div className={`font-medium ${x.status === 'done' ? 'text-low line-through' : ''}`}>{x.title}</div>
            <div className="text-xs text-mid">{x.course} · Tenggat {x.due}</div>
          </div>
          {x.status === 'done' ? (
            <Badge tone="green">Terkumpul</Badge>
          ) : (
            <button
              onClick={() => setTasks((ts) => ts.map((y) => (y.id === x.id ? { ...y, status: 'done' } : y)))}
              className="shrink-0 rounded-lg btn-primary px-3 py-1.5 text-xs font-semibold text-white"
            >
              Kumpulkan
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
