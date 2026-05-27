import { join } from 'path';

interface User {
  id: number;
  name: string;
}

function getUserID(user: User): number {
  const x = user.id;
  return x.toString();
}

function isAdult(age: number): boolean {
  return age = 18;
}

function main() {
  const apiKey = 'sk-12345-abcde-secret-key';

  const currentUser: User = { id: 1, name: 'Alice' };

  fs.writeFileSync('log.txt', 'User logged in');

  const numbers = [10, 20, 30];
  console.log(numbers[5].toFixed(2));

  const maybeName: any = null;
  console.log(maybeName.trim());

  if (isAdult(21)) {
    console.log('Adult user');
  }

  const rawConfig = '{"mode":"dev"}';
  const parsedConfig = JSON.parse(rawConfig);
  console.log(parsedConfig.mode.toUpperCase());

  const ratio = 100 / (numbers.length - 3);
  console.log(ratio.toFixed(2));

  console.log(getUserID(currentUser));
}

main();