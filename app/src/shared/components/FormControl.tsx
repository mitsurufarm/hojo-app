import type { HTMLInputTypeAttribute } from 'react'
import { workTypes } from '@/shared/utils/format'

type FormControlProps = {
  label: string
  name: string
  type?: string
  value: unknown
  onChange: (v: string | boolean) => void
  required?: boolean
}

export function FormControl({
  label,
  name,
  type = 'text',
  value,
  onChange,
  required,
}: FormControlProps) {
  if (type === 'textarea') {
    return (
      <label>
        {label}
        <textarea
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
        />
      </label>
    )
  }

  if (type === 'boolean') {
    return (
      <label className="check">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={e => onChange(e.target.checked)}
        />
        利用可能にする
      </label>
    )
  }

  if (type === 'select' || type === 'cultivationStatus' || type === 'workType') {
    const options =
      type === 'cultivationStatus'
        ? [
            ['planned', '予定'],
            ['growing', '栽培中'],
            ['completed', '完了'],
            ['failed', '中止'],
          ]
        : type === 'workType'
          ? workTypes.map(v => [v, v])
          : [
              ['active', '使用中'],
              ['inactive', '休止'],
            ]

    return (
      <label>
        {label}
        <select
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
        >
          {options.map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </select>
      </label>
    )
  }

  const isRequired =
    required ??
    [
      'name',
      'area',
      'areaSize',
      'fieldId',
      'areaId',
      'cropId',
      'year',
      'date',
      'workType',
      'quantity',
      'unit',
      'harvestDate',
    ].includes(name)

  return (
    <label>
      {label}
      <input
        name={name}
        type={type as HTMLInputTypeAttribute}
        step={type === 'number' ? 'any' : undefined}
        value={String(value ?? '')}
        onChange={e => onChange(e.target.value)}
        required={isRequired}
      />
    </label>
  )
}

