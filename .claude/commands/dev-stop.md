# /dev-stop

開発サーバーを停止する。

## 実行内容

```bash
taskkill /F /IM node.exe
```

## 確認

プロセスが停止したことを確認:
```bash
tasklist | findstr node
```
