import pandas as pd
from src.features import movement_fingerprint

def test_straight_line():
    df=pd.DataFrame({"player_id":[1]*5,"drill_id":["40"]*5,"frame":range(5),"x":[0,1,2,3,4],"y":[0]*5})
    out=movement_fingerprint(df)
    assert len(out)==1
    assert abs(out.loc[0,"distance"]-4)<1e-9
    assert abs(out.loc[0,"path_efficiency"]-1)<1e-9
    assert out.loc[0,"turn_abs_max_deg"]==0

def test_missing_schema_fails_closed():
    try:
        movement_fingerprint(pd.DataFrame({"player_id":[1]}))
        assert False
    except ValueError:
        assert True
