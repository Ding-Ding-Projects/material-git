#!/bin/sh
# Controlled source build; all input archives are verified by the invoking helper.
set -eu
export SOURCE_DATE_EPOCH=1791417600
export TZ=UTC LC_ALL=C
converter_target=${1:?Expected linux-x64 or win32-x64}
case "$converter_target" in linux-x64) converter_host=; converter_cross=; converter_vpx_target=x86_64-linux-gcc;; win32-x64) converter_host=x86_64-w64-mingw32; converter_cross=x86_64-w64-mingw32-; converter_vpx_target=x86_64-win64-gcc;; *) exit 2;; esac
mkdir -p /build/work /build/prefix /out
trap 'for converter_log in /build/*.log; do if [ -f "$converter_log" ]; then cp "$converter_log" /out/; fi; done; if [ -f /build/work/ffmpeg-9.0.2/ffbuild/config.log ]; then cp /build/work/ffmpeg-9.0.2/ffbuild/config.log /out/ffmpeg-configure-details.log; fi' EXIT
cd /build/work
for converter_archive in /sources/*.tar.*; do tar -xf "$converter_archive"; done
export CFLAGS='-O2 -fstack-protector-strong -D_FORTIFY_SOURCE=2 -ffile-prefix-map=/build=. -I/build/prefix/include'
export CXXFLAGS="$CFLAGS"
export LDFLAGS='-L/build/prefix/lib -static-libgcc'
export PKG_CONFIG_LIBDIR=/build/prefix/lib/pkgconfig
export PKG_CONFIG_PATH="$PKG_CONFIG_LIBDIR"
if [ -n "$converter_host" ]; then export CC=${converter_cross}gcc CXX=${converter_cross}g++ AR=${converter_cross}ar RANLIB=${converter_cross}ranlib; export LDFLAGS='-L/build/prefix/lib -static'; fi
converter_configure() { if [ -n "$converter_host" ]; then ./configure --host="$converter_host" --prefix=/build/prefix --disable-shared --enable-static "$@"; else ./configure --prefix=/build/prefix --disable-shared --enable-static "$@"; fi; }
for converter_library in libogg-1.3.6 libvorbis-1.3.7 opus-1.5.2 lame-3.100; do
 cd "/build/work/$converter_library"
 case "$converter_library" in opus-*) converter_configure --disable-extra-programs --disable-doc;; lame-*) converter_configure --disable-frontend;; *) converter_configure;; esac
 make -j4 > /build/"$converter_library".log 2>&1
 make install >> /build/"$converter_library".log 2>&1
 done
cd /build/work/x264-31e19f92f00c7003fa115047ce50978bc98c3a0d
if [ -n "$converter_host" ]; then ./configure --host="$converter_host" --cross-prefix="$converter_cross" --prefix=/build/prefix --enable-static --disable-cli --enable-pic --disable-opencl; else ./configure --prefix=/build/prefix --enable-static --disable-cli --enable-pic --disable-opencl; fi
make -j4 > /build/x264.log 2>&1
make install >> /build/x264.log 2>&1
cd /build/work/libvpx-6df3ec34557879fff673706f4a1d9fbd0f3a6f0e
export CROSS="$converter_cross"
./configure --target="$converter_vpx_target" --prefix=/build/prefix --disable-examples --disable-tools --disable-docs --disable-unit-tests --disable-shared --enable-static --disable-vp8 --enable-vp9
make -j4 > /build/libvpx.log 2>&1
make install >> /build/libvpx.log 2>&1
cd /build/work/ffmpeg-9.0.2
set -- --prefix=/build/prefix --extra-version=material-git-1 --disable-autodetect --disable-everything --enable-ffmpeg --enable-ffprobe --disable-ffplay --disable-doc --disable-debug --disable-network --enable-gpl --enable-version3 --enable-static --disable-shared --enable-libx264 --enable-libvpx --enable-libmp3lame --enable-libvorbis --enable-libopus --enable-protocol=file --enable-demuxer=mov,matroska,mp3,wav,flac,ogg,avi --enable-muxer=mp3,wav,flac,ogg,mp4,matroska,webm --enable-parser=aac,aac_latm,h264,hevc,vp8,vp9,mpegaudio,flac,opus,vorbis,mpeg4video,mjpeg --enable-decoder=aac,mp3,flac,vorbis,opus,h264,hevc,vp8,vp9,mpeg4,mjpeg,pcm_s16le,pcm_s24le,pcm_s32le,pcm_f32le,pcm_f64le,alac,ac3,eac3,wmav1,wmav2,pcm_u8 --enable-encoder=pcm_s16le,flac,aac,libmp3lame,libvorbis,libopus,libx264,libvpx_vp9 --enable-filter=aresample,anull,null,format,aformat,scale,color --enable-indev=lavfi --enable-swresample --enable-swscale --enable-avfilter --enable-bsf=aac_adtstoasc,h264_mp4toannexb,hevc_mp4toannexb,extract_extradata,null --extra-cflags="$CFLAGS" --extra-ldflags="$LDFLAGS" --pkg-config-flags=--static
if [ -n "$converter_host" ]; then set -- "$@" --enable-cross-compile --cross-prefix="$converter_cross" --arch=x86_64 --target-os=mingw32; fi
./configure "$@" > /build/ffmpeg-configure.log 2>&1
make -j4 > /build/ffmpeg.log 2>&1
case "$converter_target" in win32-x64) cp ffmpeg.exe ffprobe.exe /out/;; *) cp ffmpeg ffprobe /out/;; esac
cp COPYING.GPLv3 /out/ffmpeg.LICENSE
cp /build/ffmpeg-configure.log /out/configure-output.txt
cp ffbuild/config.mak /out/ffmpeg-config.mak
cp config.h /out/ffmpeg-config.h
dpkg-query -W -f='${Package}=${Version}\n' | sort > /out/build-toolchain-packages.txt

for converter_component in libogg-1.3.6 libvorbis-1.3.7 opus-1.5.2 lame-3.100 x264-31e19f92f00c7003fa115047ce50978bc98c3a0d libvpx-6df3ec34557879fff673706f4a1d9fbd0f3a6f0e; do
 for converter_notice in COPYING LICENSE; do
  if [ -f "/build/work/$converter_component/$converter_notice" ]; then cp "/build/work/$converter_component/$converter_notice" "/out/$converter_component.$converter_notice"; fi
 done
done
cp /usr/share/doc/libgcc-s1/copyright /out/gcc-runtime.COPYRIGHT
if [ -n "$converter_host" ]; then cp /usr/share/doc/gcc-mingw-w64-x86-64-posix-runtime/copyright /out/mingw-runtime.COPYRIGHT; fi
