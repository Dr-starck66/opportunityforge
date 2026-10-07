"""Movement fingerprint features for tracking trajectories."""
from __future__ import annotations
import numpy as np
import pandas as pd

EPS=1e-9

def _angle_diff_deg(a: pd.Series) -> pd.Series:
    d=a.diff()
    return (d+180.0)%360.0-180.0

def movement_fingerprint(df: pd.DataFrame, group_cols=("player_id","drill_id"), hz: float=10.0) -> pd.DataFrame:
    """Aggregate frame-level trajectories into interpretable movement features.

    Required: group cols + frame + x + y. Optional: speed, accel, direction.
    """
    req=set(group_cols)|{"frame","x","y"}
    missing=req-set(df.columns)
    if missing:
        raise ValueError(f"missing columns: {sorted(missing)}")
    rows=[]
    for keys,g in df.sort_values([*group_cols,"frame"]).groupby(list(group_cols),sort=False):
        g=g.copy()
        dx=g.x.diff(); dy=g.y.diff()
        step=np.hypot(dx,dy)
        speed=g["speed"] if "speed" in g else step*hz
        accel=g["accel"] if "accel" in g else speed.diff()*hz
        jerk=accel.diff()*hz
        heading=np.degrees(np.arctan2(dy,dx))
        turn=np.abs(_angle_diff_deg(pd.Series(heading,index=g.index)))
        path=float(step.fillna(0).sum())
        disp=float(np.hypot(g.x.iloc[-1]-g.x.iloc[0],g.y.iloc[-1]-g.y.iloc[0]))
        k=keys if isinstance(keys,tuple) else (keys,)
        r=dict(zip(group_cols,k))
        r.update({
            "n_frames":len(g),
            "duration_s":max((len(g)-1)/hz,0),
            "distance":path,
            "displacement":disp,
            "path_efficiency":disp/(path+EPS),
            "speed_mean":float(speed.mean()),
            "speed_max":float(speed.max()),
            "accel_mean":float(accel.mean()),
            "accel_max":float(accel.max()),
            "decel_peak":float(accel.min()),
            "jerk_abs_mean":float(jerk.abs().mean()),
            "turn_abs_mean_deg":float(turn.mean()),
            "turn_abs_max_deg":float(turn.max()),
            "high_turn_frames":int((turn>=30).sum()),
        })
        rows.append(r)
    return pd.DataFrame(rows)
