import conf from '@/config';
import WebSocket from 'ws';

export default function subscribeChannel(id: number, terminateFunc: (data: any) => boolean, doFunc: (data: any) => void) {
    return new Promise(resolve => {
        const data = {
            event: 'pusher:subscribe',
            data: {
                channel: `solution-${id}`
            }
        };

        const socket = new WebSocket(conf.SUBMITSTATWS);

        let timeout: NodeJS.Timeout;

        socket.addEventListener('open', () => {
            socket.send(JSON.stringify(data));
            timeout = setTimeout(() => {
                socket.close();
                resolve(null);
            }, 60000);
        });

        socket.addEventListener('message', (event) => {
            const parsedObj = JSON.parse(event.data.toString());
            const data = JSON.parse(parsedObj.data);
            if(parsedObj.event === 'update') {
                if(terminateFunc(data)) {
                    clearTimeout(timeout);
                    socket.close();
                    resolve(data);
                }
                doFunc(data);
            }
            
        });
    })
    
}
