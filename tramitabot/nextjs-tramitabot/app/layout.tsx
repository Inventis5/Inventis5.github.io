import "./global.css"

export const metadata = {
    title: 'TRAMITAGPT',
    description: 'El lugar donde puedes encontrar informacion sobre los tramites'
}

const RootLayout=({ children}) =>{
    return(
        <html lang="es">
            <body>
                {children}
            </body>
        </html>
    )
}

export default RootLayout