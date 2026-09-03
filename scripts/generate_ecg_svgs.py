# ECG Lab SVG generator (educational simulation)
# Generates 114 deterministic, thin-line Lead II rhythm strips for training.
# Educational use only — not intended for clinical diagnosis.
from pathlib import Path
import hashlib
import math
import random

WIDTH, HEIGHT = 2800, 900
BASELINE = 465.0
SEC_PER_STRIP = 10.0
X0, X1 = 180, 2700
AMP = 95.0
TRACE_SW = 1.4
CAL_SW = 1.05
SMALL_GRID_SW = 0.75
BIG_GRID_SW = 1.4
SAMPLES = 2201

LABELS = {
    'sinus':'Ritmo sinusal','sinus_brady':'Bradicardia sinusal','sinus_tachy':'Taquicardia sinusal','sinus_arrhythmia':'Arritmia sinusal',
    'afib':'Fibrilação atrial','flutter':'Flutter atrial','svt':'Taquicardia supraventricular','psvt':'TSV paroxística','paced':'Ritmo estimulado por marcapasso',
    'bigeminy':'Bigeminismo ventricular','trigeminy':'Trigeminismo ventricular','pvc':'Extrassístole ventricular','pac':'Extrassístole atrial',
    'avb1':'BAV de 1º grau','mobitz1':'BAV de 2º grau — Mobitz I','mobitz2':'BAV de 2º grau — Mobitz II','avb3':'BAV de 3º grau','vt':'Taquicardia ventricular','vf':'Fibrilação ventricular'
}
CATEGORIES = list(LABELS)


def stable_rng(kind: str, var_idx: int) -> random.Random:
    digest = hashlib.sha256(f'ecg-lab-v3|{kind}|{var_idx}'.encode('utf-8')).digest()
    return random.Random(int.from_bytes(digest[:8], 'big'))


def g(t, mu, sigma, amp):
    return amp * math.exp(-0.5 * ((t - mu) / sigma) ** 2)


def qrs_narrow(t, c, amp_r=1.0):
    return (
        g(t, c - 0.016, 0.008, -0.12 * amp_r)
        + g(t, c, 0.010, 1.05 * amp_r)
        + g(t, c + 0.022, 0.012, -0.28 * amp_r)
    )


def qrs_wide(t, c, amp_r=1.0, polarity=1):
    sign = 1 if polarity >= 0 else -1
    return sign * (
        g(t, c - 0.035, 0.024, -0.18 * amp_r)
        + g(t, c, 0.034, 1.08 * amp_r)
        + g(t, c + 0.060, 0.036, -0.40 * amp_r)
    )


def p_wave(t, c, amp_p=0.14, width=0.040):
    return g(t, c, width, amp_p)


def t_wave(t, c, amp_t=0.30, width=0.09):
    return g(t, c, width, amp_t)


def regular_beats(hr, start=0.75, duration=SEC_PER_STRIP, jitter=0.0, rng=None):
    rr = 60.0 / hr
    t = start
    beats = []
    while t < duration - 0.35:
        beats.append(t)
        t += rr + (rng.uniform(-jitter, jitter) if rng and jitter else 0.0)
    return beats


def add_baseline_wander(sig, ts, rng, scale=0.015):
    ph1 = rng.random() * math.tau
    ph2 = rng.random() * math.tau
    for i, t in enumerate(ts):
        sig[i] += scale * math.sin(2 * math.pi * 0.22 * t + ph1)
        sig[i] += 0.5 * scale * math.sin(2 * math.pi * 0.06 * t + ph2)


def add_sinus_beat(sig, ts, b, p_offset=0.17, p_amp=0.13, p_width=0.038,
                   qrs_amp=1.0, t_offset=0.28, t_amp=0.29, t_width=0.085):
    for i, t in enumerate(ts):
        sig[i] += p_wave(t, b - p_offset, p_amp, p_width)
        sig[i] += qrs_narrow(t, b, qrs_amp)
        sig[i] += t_wave(t, b + t_offset, t_amp, t_width)


def gen_signal(kind, var_idx):
    rng = stable_rng(kind, var_idx)
    ts = [SEC_PER_STRIP * i / (SAMPLES - 1) for i in range(SAMPLES)]
    sig = [0.0] * SAMPLES
    extras = []

    if kind == 'sinus':
        hr = 70 + rng.randint(-6, 8)
        beats = regular_beats(hr, start=0.82 + rng.uniform(-0.05, 0.03), jitter=0.010, rng=rng)
        for b in beats:
            add_sinus_beat(sig, ts, b,
                p_offset=0.17 + rng.uniform(-0.004, 0.004),
                p_amp=0.13 + rng.uniform(-0.008, 0.012),
                p_width=0.038 + rng.uniform(-0.003, 0.003),
                qrs_amp=1.0 + rng.uniform(-0.035, 0.035),
                t_offset=0.28 + rng.uniform(-0.008, 0.008),
                t_amp=0.29 + rng.uniform(-0.025, 0.025),
                t_width=0.085 + rng.uniform(-0.007, 0.007))
        add_baseline_wander(sig, ts, rng, 0.008)

    elif kind == 'sinus_brady':
        hr = 48 + rng.randint(-4, 6)
        beats = regular_beats(hr, start=0.95 + rng.uniform(-0.08, 0.04), jitter=0.015, rng=rng)
        for b in beats:
            add_sinus_beat(sig, ts, b, p_offset=0.18,
                p_amp=0.13 + rng.uniform(-0.008, 0.008),
                p_width=0.041 + rng.uniform(-0.003, 0.003),
                qrs_amp=1.02 + rng.uniform(-0.03, 0.03), t_offset=0.30,
                t_amp=0.30 + rng.uniform(-0.02, 0.02),
                t_width=0.10 + rng.uniform(-0.008, 0.008))
        add_baseline_wander(sig, ts, rng, 0.010)

    elif kind == 'sinus_tachy':
        # Keep sinus P waves deliberately visible. At high rates the P may approach the
        # preceding T wave, but it still precedes every QRS with consistent morphology.
        hr = 112 + rng.randint(0, 22)
        beats = regular_beats(hr, start=0.60 + rng.uniform(-0.04, 0.03), jitter=0.006, rng=rng)
        for b in beats:
            add_sinus_beat(sig, ts, b,
                p_offset=0.135 + rng.uniform(-0.004, 0.004),
                p_amp=0.135 + rng.uniform(-0.010, 0.010),
                p_width=0.030 + rng.uniform(-0.002, 0.002),
                qrs_amp=0.98 + rng.uniform(-0.03, 0.03),
                t_offset=0.205 + rng.uniform(-0.006, 0.006),
                t_amp=0.21 + rng.uniform(-0.018, 0.018),
                t_width=0.065 + rng.uniform(-0.005, 0.005))
        add_baseline_wander(sig, ts, rng, 0.006)

    elif kind == 'sinus_arrhythmia':
        base_hr = 72 + rng.randint(-5, 5)
        rr = 60 / base_hr
        t = 0.8 + rng.uniform(-0.04, 0.04)
        phase = rng.random() * math.tau
        beats = []
        while t < SEC_PER_STRIP - 0.35:
            beats.append(t)
            t += rr * (1 + 0.16 * math.sin(2 * math.pi * 0.20 * t + phase))
        for b in beats:
            add_sinus_beat(sig, ts, b, p_offset=0.17, p_amp=0.13, p_width=0.039,
                           qrs_amp=1.0, t_offset=0.28, t_amp=0.28, t_width=0.09)
        add_baseline_wander(sig, ts, rng, 0.008)

    elif kind == 'afib':
        t = 0.72 + rng.uniform(-0.05, 0.05)
        beats = []
        while t < SEC_PER_STRIP - 0.35:
            beats.append(t)
            t += rng.uniform(0.42, 0.95)
        phases = [rng.random() * math.tau for _ in range(4)]
        freqs = [5.8, 7.3, 9.1, 11.7]
        for i, tt in enumerate(ts):
            baseline = 0.0
            for j, f in enumerate(freqs):
                baseline += (0.020 / (1 + j * 0.25)) * math.sin(2 * math.pi * f * tt + phases[j])
            baseline += 0.010 * math.sin(2 * math.pi * 0.7 * tt + phases[0])
            sig[i] += baseline
        for b in beats:
            qamp = 0.95 + rng.uniform(-0.035, 0.035)
            tamp = 0.20 + rng.uniform(-0.015, 0.020)
            for i, tt in enumerate(ts):
                sig[i] += qrs_narrow(tt, b, qamp)
                sig[i] += t_wave(tt, b + 0.25, tamp, 0.08)
        add_baseline_wander(sig, ts, rng, 0.003)

    elif kind == 'flutter':
        conduction = rng.choice([2, 2, 2, 3, 4])
        atrial_cycle = 0.20 + rng.uniform(-0.008, 0.008)
        qrs_hr = 60 / (atrial_cycle * conduction)
        beats = regular_beats(qrs_hr, start=0.86 + rng.uniform(-0.03, 0.03), jitter=0.004, rng=rng)
        for i, tt in enumerate(ts):
            phase = (tt / atrial_cycle) % 1
            saw = 2 * phase - 1
            sig[i] += 0.115 * (0.78 * saw + 0.22 * math.sin(2 * math.pi * phase))
        for b in beats:
            for i, tt in enumerate(ts):
                sig[i] += qrs_narrow(tt, b, 0.98)
                sig[i] += t_wave(tt, b + 0.23, 0.16, 0.065)

    elif kind == 'svt':
        hr = 168 + rng.randint(-10, 16)
        beats = regular_beats(hr, start=0.55 + rng.uniform(-0.03, 0.03), jitter=0.003, rng=rng)
        for b in beats:
            for i, tt in enumerate(ts):
                sig[i] += qrs_narrow(tt, b, 0.94)
                sig[i] += p_wave(tt, b + 0.07, -0.045, 0.022)
                sig[i] += t_wave(tt, b + 0.16, 0.15, 0.055)
        add_baseline_wander(sig, ts, rng, 0.003)

    elif kind == 'psvt':
        hr = 182 + rng.randint(-10, 14)
        onset = 2.1 + rng.uniform(-0.25, 0.25)
        beats = [b for b in regular_beats(74, start=0.85, jitter=0.008, rng=rng) if b < onset - 0.25]
        t = onset
        rr = 60 / hr
        while t < SEC_PER_STRIP - 0.3:
            beats.append(t)
            t += rr + rng.uniform(-0.003, 0.003)
        for b in sorted(beats):
            if b < onset - 0.25:
                add_sinus_beat(sig, ts, b, p_offset=0.17, p_amp=0.12, p_width=0.038,
                               qrs_amp=1.0, t_offset=0.28, t_amp=0.28, t_width=0.08)
            else:
                for i, tt in enumerate(ts):
                    sig[i] += qrs_narrow(tt, b, 0.94)
                    sig[i] += p_wave(tt, b + 0.065, -0.040, 0.021)
                    sig[i] += t_wave(tt, b + 0.16, 0.14, 0.055)
        add_baseline_wander(sig, ts, rng, 0.003)

    elif kind == 'paced':
        hr = 68 + rng.randint(-8, 10)
        beats = regular_beats(hr, start=0.86, jitter=0.006, rng=rng)
        for b in beats:
            spike_x = X0 + (b / SEC_PER_STRIP) * (X1 - X0)
            extras.append(f'<path d="M {spike_x:.2f} {BASELINE+12:.1f} L {spike_x:.2f} {BASELINE-115:.1f}" stroke="#111111" stroke-width="0.9" fill="none" vector-effect="non-scaling-stroke"/>')
            qamp = 1.0 + rng.uniform(-0.035, 0.035)
            tamp = -0.16 + rng.uniform(-0.020, 0.020)
            for i, tt in enumerate(ts):
                sig[i] += qrs_wide(tt, b + 0.018, qamp, polarity=1)
                sig[i] += t_wave(tt, b + 0.34, tamp, 0.11)
        add_baseline_wander(sig, ts, rng, 0.004)

    elif kind == 'bigeminy':
        hr = 72 + rng.randint(-4, 5)
        rr = 60 / hr
        t = 0.90
        while t < SEC_PER_STRIP - 0.35:
            add_sinus_beat(sig, ts, t, p_offset=0.17, p_amp=0.13, p_width=0.038,
                           qrs_amp=1.0, t_offset=0.29, t_amp=0.26, t_width=0.085)
            pvc_t = t + rr * 0.58
            if pvc_t < SEC_PER_STRIP - 0.35:
                for i, tt in enumerate(ts):
                    sig[i] += qrs_wide(tt, pvc_t, 1.15, 1)
                    sig[i] += t_wave(tt, pvc_t + 0.31, -0.19, 0.12)
            t += rr * 2.0
        add_baseline_wander(sig, ts, rng, 0.006)

    elif kind == 'trigeminy':
        hr = 74 + rng.randint(-5, 5)
        rr = 60 / hr
        t = 0.84
        while t < SEC_PER_STRIP - 0.35:
            for offset in (0, rr):
                b = t + offset
                if b < SEC_PER_STRIP - 0.35:
                    add_sinus_beat(sig, ts, b, p_offset=0.17, p_amp=0.13, p_width=0.038,
                                   qrs_amp=1.0, t_offset=0.29, t_amp=0.26, t_width=0.085)
            pvc_t = t + rr + rr * 0.58
            if pvc_t < SEC_PER_STRIP - 0.35:
                for i, tt in enumerate(ts):
                    sig[i] += qrs_wide(tt, pvc_t, 1.12, 1)
                    sig[i] += t_wave(tt, pvc_t + 0.31, -0.18, 0.12)
            t += rr * 3.0
        add_baseline_wander(sig, ts, rng, 0.006)

    elif kind == 'pvc':
        hr = 76 + rng.randint(-6, 6)
        rr = 60 / hr
        beats = regular_beats(hr, start=0.82, jitter=0.006, rng=rng)
        pvc_indices = set(rng.sample(range(2, max(3, len(beats) - 2)), k=2 if len(beats) > 8 else 1))
        for idx, b in enumerate(beats):
            if idx in pvc_indices and idx > 0:
                prev = beats[idx - 1]
                pvc_t = prev + rr * 0.62
                for i, tt in enumerate(ts):
                    sig[i] += qrs_wide(tt, pvc_t, 1.12, 1)
                    sig[i] += t_wave(tt, pvc_t + 0.31, -0.18, 0.115)
                continue
            add_sinus_beat(sig, ts, b, p_offset=0.17, p_amp=0.13, p_width=0.038,
                           qrs_amp=1.0, t_offset=0.29, t_amp=0.27, t_width=0.085)
        add_baseline_wander(sig, ts, rng, 0.006)

    elif kind == 'pac':
        hr = 76 + rng.randint(-6, 6)
        beats = regular_beats(hr, start=0.82, jitter=0.006, rng=rng)
        pac_indices = set(rng.sample(range(2, max(3, len(beats) - 1)), k=2 if len(beats) > 8 else 1))
        for idx, b0 in enumerate(beats):
            if idx in pac_indices:
                b = b0 - 0.18
                for i, tt in enumerate(ts):
                    sig[i] += p_wave(tt, b - 0.11, 0.105, 0.030)
                    sig[i] += qrs_narrow(tt, b, 0.98)
                    sig[i] += t_wave(tt, b + 0.26, 0.23, 0.075)
            else:
                add_sinus_beat(sig, ts, b0, p_offset=0.17, p_amp=0.13, p_width=0.038,
                               qrs_amp=1.0, t_offset=0.29, t_amp=0.27, t_width=0.085)
        add_baseline_wander(sig, ts, rng, 0.006)

    elif kind == 'avb1':
        hr = 72 + rng.randint(-4, 4)
        beats = regular_beats(hr, start=0.86, jitter=0.006, rng=rng)
        pr = 0.26 + rng.uniform(-0.010, 0.020)
        for b in beats:
            for i, tt in enumerate(ts):
                sig[i] += p_wave(tt, b - pr, 0.13, 0.038)
                sig[i] += qrs_narrow(tt, b, 1.0)
                sig[i] += t_wave(tt, b + 0.29, 0.27, 0.09)
        add_baseline_wander(sig, ts, rng, 0.006)

    elif kind == 'mobitz1':
        atrial_hr = 82 + rng.randint(-5, 5)
        pp = 60 / atrial_hr
        p_time = 0.62
        cycle_len = rng.choice([3, 4])
        while p_time < SEC_PER_STRIP - 0.35:
            for k in range(cycle_len + 1):
                if p_time >= SEC_PER_STRIP - 0.35:
                    break
                pr = 0.16 + 0.045 * k
                for i, tt in enumerate(ts):
                    sig[i] += p_wave(tt, p_time, 0.13, 0.038)
                if k < cycle_len:
                    q = p_time + pr
                    for i, tt in enumerate(ts):
                        sig[i] += qrs_narrow(tt, q, 1.0)
                        sig[i] += t_wave(tt, q + 0.28, 0.25, 0.085)
                p_time += pp
        add_baseline_wander(sig, ts, rng, 0.006)

    elif kind == 'mobitz2':
        atrial_hr = 76 + rng.randint(-4, 4)
        pp = 60 / atrial_hr
        p_time = 0.62
        pr = 0.18 + rng.uniform(-0.008, 0.008)
        drop_every = rng.choice([3, 4])
        idx = 0
        while p_time < SEC_PER_STRIP - 0.35:
            for i, tt in enumerate(ts):
                sig[i] += p_wave(tt, p_time, 0.13, 0.038)
            if idx % drop_every != drop_every - 1:
                q = p_time + pr
                for i, tt in enumerate(ts):
                    sig[i] += qrs_narrow(tt, q, 1.0)
                    sig[i] += t_wave(tt, q + 0.28, 0.25, 0.085)
            p_time += pp
            idx += 1
        add_baseline_wander(sig, ts, rng, 0.006)

    elif kind == 'avb3':
        atrial_hr = 92 + rng.randint(-8, 10)
        vent_hr = 38 + rng.randint(-4, 5)
        p_times = regular_beats(atrial_hr, start=0.55, jitter=0.006, rng=rng)
        qrs_times = regular_beats(vent_hr, start=1.10, jitter=0.010, rng=rng)
        for p in p_times:
            for i, tt in enumerate(ts):
                sig[i] += p_wave(tt, p, 0.11, 0.034)
        escape_polarity = 1 if var_idx % 2 else -1
        for b in qrs_times:
            qamp = 0.90 + rng.uniform(-0.025, 0.025)
            for i, tt in enumerate(ts):
                sig[i] += qrs_wide(tt, b, qamp, escape_polarity)
                sig[i] += t_wave(tt, b + 0.34, -0.14 * escape_polarity, 0.11)
        add_baseline_wander(sig, ts, rng, 0.006)

    elif kind == 'vt':
        hr = 156 + rng.randint(-8, 20)
        beats = regular_beats(hr, start=0.58, jitter=0.003, rng=rng)
        polarity = 1 if var_idx % 2 else -1
        base_amp = 1.18 + rng.uniform(-0.04, 0.05)
        for b in beats:
            qamp = base_amp + rng.uniform(-0.015, 0.015)
            for i, tt in enumerate(ts):
                sig[i] += qrs_wide(tt, b, qamp, polarity)
                sig[i] += t_wave(tt, b + 0.18, -0.19 * polarity, 0.095)
        add_baseline_wander(sig, ts, rng, 0.003)

    elif kind == 'vf':
        phases = [rng.random() * math.tau for _ in range(6)]
        freqs = [3.2 + rng.random() * 1.3, 4.7 + rng.random() * 1.7,
                 6.5 + rng.random() * 1.8, 8.9 + rng.random() * 2.0]
        for i, tt in enumerate(ts):
            slow_env = 0.62 + 0.24 * math.sin(2 * math.pi * 0.17 * tt + phases[0])
            slow_env += 0.10 * math.sin(2 * math.pi * 0.31 * tt + phases[1])
            val = (0.40 * math.sin(2 * math.pi * freqs[0] * tt + phases[2])
                + 0.24 * math.sin(2 * math.pi * freqs[1] * tt + phases[3])
                + 0.15 * math.sin(2 * math.pi * freqs[2] * tt + phases[4])
                + 0.09 * math.sin(2 * math.pi * freqs[3] * tt + phases[5]))
            val += 0.05 * math.sin(2 * math.pi * (5.5 + 0.6 * math.sin(2 * math.pi * 0.13 * tt)) * tt)
            sig[i] += slow_env * val
        add_baseline_wander(sig, ts, rng, 0.002)

    y = [max(90, min(810, BASELINE - v * AMP)) for v in sig]
    return y, extras


def draw_strip_svg(path, rhythm_label, desc, y_values, extras=None):
    pts = []
    n = len(y_values)
    for i, y in enumerate(y_values):
        x = X0 + (X1 - X0) * i / (n - 1)
        pts.append(f"{x:.2f},{y:.2f}")
    d = "M " + " L ".join(pts)
    extra_svg = '\n'.join(extras or [])
    path.write_text(f'''<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}" role="img" aria-labelledby="title desc">
<title id="title">{rhythm_label}</title><desc id="desc">{desc}</desc>
<defs>
  <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f6b7be" stroke-width="{SMALL_GRID_SW}"/></pattern>
  <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><rect width="50" height="50" fill="url(#smallGrid)"/><path d="M 50 0 L 0 0 0 50" fill="none" stroke="#ec6674" stroke-width="{BIG_GRID_SW}"/></pattern>
</defs>
<rect width="{WIDTH}" height="{HEIGHT}" fill="#ffffff"/>
<rect x="24" y="32" width="2740" height="820" rx="4" fill="url(#grid)" stroke="#e85b69" stroke-width="1.5"/>
<text x="62" y="92" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="600" fill="#111111">Lead II</text>
<path d="M 50 {BASELINE:.1f} L 72 {BASELINE:.1f} L 72 {BASELINE-100:.1f} L 122 {BASELINE-100:.1f} L 122 {BASELINE:.1f} L 155 {BASELINE:.1f}" fill="none" stroke="#111111" stroke-width="{CAL_SW}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
{extra_svg}
<path d="{d}" fill="none" stroke="#111111" stroke-width="{TRACE_SW}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
</svg>''', encoding='utf-8')


def rebuild(output_root: Path):
    assets = output_root / 'assets' / 'ecg'
    for cat in CATEGORIES:
        d = assets / cat
        d.mkdir(parents=True, exist_ok=True)
        for i in range(1, 7):
            ys, extras = gen_signal(cat, i)
            draw_strip_svg(d / f'{cat}_{i:02d}.svg', f'{LABELS[cat]} — variação {i}',
                'Traçado vetorial educacional em Lead II, reconstruído para treinamento de interpretação de ECG.', ys, extras)


if __name__ == '__main__':
    here = Path(__file__).resolve().parents[1]
    rebuild(here)
    print('ECG SVG library rebuilt at', here / 'assets' / 'ecg')
