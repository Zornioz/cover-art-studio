; Lists CoverArt Studio under "Öffnen mit" for images without taking over the default
; program for them (fileAssociations in electron-builder.yml would do that).
!macro registerImageOpenWith EXT
  WriteRegStr SHELL_CONTEXT "Software\Classes\.${EXT}\OpenWithProgids" "CoverArtStudio.Image" ""
!macroend

!macro unregisterImageOpenWith EXT
  DeleteRegValue SHELL_CONTEXT "Software\Classes\.${EXT}\OpenWithProgids" "CoverArtStudio.Image"
!macroend

!macro customInstall
  WriteRegStr SHELL_CONTEXT "Software\Classes\CoverArtStudio.Image" "" "CoverArt Studio"
  WriteRegStr SHELL_CONTEXT "Software\Classes\CoverArtStudio.Image\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'
  !insertmacro registerImageOpenWith png
  !insertmacro registerImageOpenWith jpg
  !insertmacro registerImageOpenWith jpeg
  !insertmacro registerImageOpenWith webp
!macroend

!macro customUnInstall
  DeleteRegKey SHELL_CONTEXT "Software\Classes\CoverArtStudio.Image"
  !insertmacro unregisterImageOpenWith png
  !insertmacro unregisterImageOpenWith jpg
  !insertmacro unregisterImageOpenWith jpeg
  !insertmacro unregisterImageOpenWith webp
!macroend
