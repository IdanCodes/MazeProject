import time
import numpy as np
import random

def is_number(s: str) -> bool:
    try:
        float(s)
        return True
    except ValueError:
        return False
    
# min is inclusive, max is exclusive
def get_random_int(min: int, max: int) -> int:
  min = np.ceil(min)
  max = np.floor(max)
  return int(np.floor(random.random() * (max - min) + min))

# get time in ms since epoch
def get_time_ms():
    return (time.time_ns() // 1_000_000)