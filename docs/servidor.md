# Montar el servidor

Guía para dejar Copolero andando en una dirección web, prendido siempre, para
que los dos entren desde donde quieran sin instalar nada.

Todo el trabajo está en `deploy/`. Lo que sigue es qué contratar y qué escribir.

---

## Antes: verlo en tu propia máquina

Si solo querés mirarlo antes de contratar nada, hay un comando que baja el
código, lo compila y lo levanta. Hace falta tener [Node](https://nodejs.org)
(versión LTS) y [git](https://git-scm.com) instalados.

**Mac o Linux**, en la terminal:

```bash
curl -fsSL https://raw.githubusercontent.com/alanpomato/Copolero/main/deploy/probar-local.sh | bash
```

**Windows**, en PowerShell:

```powershell
irm https://raw.githubusercontent.com/alanpomato/Copolero/main/deploy/probar-local.ps1 | iex
```

Después abrís `http://localhost:5173`. Para cortarlo, `Ctrl + C`.

Esto corre solo en tu máquina: la otra persona no lo ve. Para eso está el resto
de la guía.

---

## 1. Qué contratar

Un VPS chico con **Ubuntu 24.04 LTS**. Alcanza y sobra con el más barato: la
aplicación es un proceso de Node y un archivo SQLite.

| Proveedor        | Plan                    | Precio        | Por qué                                                                                                       |
| ---------------- | ----------------------- | ------------- | ------------------------------------------------------------------------------------------------------------- |
| **Hetzner**      | CX22 · 2 vCPU · 4 GB    | ~4 € al mes   | El más barato por lejos y con el doble de máquina. Puede pedir verificación de identidad al crear la cuenta.  |
| **DigitalOcean** | Basic · 1 vCPU · 1 GB   | ~6 US$ al mes | El más fácil de arrancar, acepta PayPal y suele dar crédito de regalo a cuentas nuevas. Documentación enorme. |
| **Vultr**        | Regular · 1 vCPU · 1 GB | ~5 US$ al mes | Tiene datacenter en San Pablo, el más cerca de Argentina. Acepta PayPal.                                      |

La latencia no importa: el juego es por turnos, nadie va a notar 150 ms. Elegí
por precio y por qué medio de pago te resulte más cómodo.

> Los servicios del exterior suelen tener impuestos y percepciones encima según
> con qué pagues. Fijate el total antes de confirmar.

Al crear la máquina:

- **Sistema**: Ubuntu 24.04 LTS.
- **Autenticación**: si te deja cargar una clave SSH, mejor (más seguro y no
  tenés que acordarte de nada). Si no, una contraseña sirve.
- **Ubicación**: la que quieras.

Anotá la **IP** que te da al terminar.

## 2. Un dominio (opcional pero recomendado)

Sin dominio funciona igual, pero por HTTP sin candado. Con dominio, el
certificado HTTPS sale solo y gratis.

Cualquier registrador sirve (Namecheap, Cloudflare, Donweb). Cuesta unos 10-15
dólares al año. Una vez comprado, creá un registro **A** apuntando a la IP del
servidor:

```
Tipo: A     Nombre: copolero     Valor: la.ip.del.servidor
```

Tarda entre unos minutos y un par de horas en propagarse.

## 3. Entrar al servidor

Desde tu terminal:

```bash
ssh root@la.ip.del.servidor
```

La primera vez te pregunta si confiás en la máquina: escribí `yes`.

## 4. Instalar

Un solo comando, ya adentro del servidor:

```bash
curl -fsSL https://raw.githubusercontent.com/alanpomato/Copolero/main/deploy/instalar.sh \
  | bash -s -- copolero.tudominio.com
```

Si todavía no tenés dominio, poné la IP en su lugar:

```bash
curl -fsSL https://raw.githubusercontent.com/alanpomato/Copolero/main/deploy/instalar.sh \
  | bash -s -- 203.0.113.10
```

Tarda unos minutos. Instala Node, Caddy, crea el usuario del servicio, baja el
código, lo compila, y lo deja corriendo como servicio que arranca solo si el
servidor se reinicia.

> **Mientras el código viva en la rama de trabajo** y no en `main`, agregá la
> rama al final:
> `| bash -s -- copolero.tudominio.com claude/buenas-9b6dk2`
> (y bajá el script desde esa misma rama, cambiando `/main/` en la URL).

Cuando termina te dice la dirección. Entrás, creás una partida, y le pasás el
código de invitación a la otra persona.

## 5. Actualizar cuando haya cambios

```bash
ssh root@la.ip.del.servidor 'bash /opt/copolero/deploy/actualizar.sh'
```

Baja lo nuevo, compila y reinicia. Si la compilación falla **no reinicia**:
vuelve a la versión anterior y te avisa, así el juego nunca queda caído por un
cambio roto.

### Que se actualice solo

Hay un workflow (`.github/workflows/desplegar.yml`) que hace eso en cada push.
Para activarlo, cargá tres secretos en el repositorio, en
**Settings → Secrets and variables → Actions**:

| Secreto            | Valor                                    |
| ------------------ | ---------------------------------------- |
| `SERVIDOR_HOST`    | la IP o el dominio                       |
| `SERVIDOR_USUARIO` | `root`                                   |
| `SERVIDOR_SSH_KEY` | el contenido de tu clave privada, entero |

Para generar la clave, si no tenés una:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/copolero_deploy -N ""
ssh-copy-id -i ~/.ssh/copolero_deploy.pub root@la.ip.del.servidor
cat ~/.ssh/copolero_deploy      # esto es lo que va en el secreto
```

Sin esos secretos el workflow no hace nada y no falla.

## 6. El día a día

```bash
# Ver qué está pasando, en vivo
journalctl -u copolero -f

# Reiniciar
systemctl restart copolero

# Ver si está andando
systemctl status copolero
```

### Respaldar las partidas

Toda la partida vive en un solo archivo. Para copiarlo sin cortar el servicio:

```bash
apt install -y sqlite3
sqlite3 /var/lib/copolero/copolero.db ".backup /root/respaldo.db"
```

Y para bajártelo a tu PC, desde **tu** terminal:

```bash
scp root@la.ip.del.servidor:/root/respaldo.db .
```

Si alguna vez hay que restaurar: parás el servicio, copiás el respaldo encima de
`/var/lib/copolero/copolero.db`, y lo arrancás de nuevo.

## 7. Si algo no anda

| Síntoma                                               | Qué mirar                                                                                                                    |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| La página no carga                                    | `systemctl status copolero` y `systemctl status caddy`                                                                       |
| Dice "Cross-site POST form submissions are forbidden" | El `ORIGIN` de `/etc/copolero.env` no coincide con la dirección por la que entrás. Corregilo y `systemctl restart copolero`. |
| El HTTPS no aparece                                   | El dominio todavía no apunta al servidor. Verificá con `dig copolero.tudominio.com`                                          |
| Se reinició el servidor                               | No hay nada que hacer: el servicio arranca solo                                                                              |

Para ver los errores de la aplicación con detalle:

```bash
journalctl -u copolero -n 100 --no-pager
```
