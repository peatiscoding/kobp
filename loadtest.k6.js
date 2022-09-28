import http from 'k6/http';
import { sleep } from 'k6';

export default function () {
  http.get('http://0.0.0.0:3456/library/');
  http.post('http://0.0.0.0:3456/book/load/');
  sleep(1);
}