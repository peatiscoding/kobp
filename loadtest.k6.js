import http from 'k6/http';
import { sleep, check } from 'k6';

export default function () {
  const res = http.get('http://0.0.0.0:3456/library/');
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  const res2 = http.post('http://0.0.0.0:3456/book/load/');
  check(res2, {
    'status is 200': (r) => r.status === 200,
  });
  console.log(`Response::: ${res.body}`)
  sleep(1);
}