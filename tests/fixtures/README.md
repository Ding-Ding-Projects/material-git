# Synthetic media fixture

`tiny-video.base64` contains a real two-second H.264/MP4 file with four 16×16 solid red frames. It contains no user media. It was generated with FFmpeg 7.0.2 using the fixed arguments `-f lavfi -i color=c=red:s=16x16:r=2:d=2 -c:v libx264 -pix_fmt yuv420p -threads 1`. The source generation executable is not distributed. Tests decode this bounded fixture and use the reviewed current bundled engine to transcode and reopen its actual output.
