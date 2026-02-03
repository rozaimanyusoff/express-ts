import * as userModel from '../src/p.user/userModel';

async function findRamcoId() {
	try {
		console.log('🔍 Finding user by email: rozaiman@ranhill.com.my\n');

		// Get all users
		const users = await userModel.getAllUsers();
		const rozaiman = users.find((u: any) => u.email === 'rozaiman@ranhill.com.my');

		if (rozaiman) {
			console.log('✅ User found!');
			console.log(`   ID: ${rozaiman.id}`);
			console.log(`   Ramco ID: ${rozaiman.ramco_id}`);
			console.log(`   Full Name: ${rozaiman.full_name || rozaiman.name}`);
			console.log(`   Email: ${rozaiman.email}\n`);
			console.log('📝 Use this ramco_id in the fleet card notification tests:');
			console.log(`   updated_by: "${rozaiman.ramco_id}"`);
		} else {
			console.log('❌ User not found in applications.users database');
			console.log('\n📋 Showing first 5 users with "@ranhill.com.my" email:');
			users
				.filter((u: any) => u.email?.includes('@ranhill.com.my'))
				.slice(0, 5)
				.forEach((u: any, idx: number) => {
					console.log(`\n${idx + 1}. ${u.full_name || u.name}`);
					console.log(`   Ramco ID: ${u.ramco_id}`);
					console.log(`   Email: ${u.email}`);
				});
		}
	} catch (error) {
		console.error('❌ Error:', error);
		process.exit(1);
	}
}

findRamcoId();
